import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { User } from '../models/User'
import { JWTPayload } from '../types'
import { asyncHandler } from '../utils/asyncHandler'
import { AuthRequest } from '../middleware/auth'

const signAccess = (p: JWTPayload) =>
  jwt.sign(p, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' } as object)

const signRefresh = (p: JWTPayload) =>
  jwt.sign(p, process.env.JWT_REFRESH_SECRET!, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d' } as object)

export const login = asyncHandler(async (req: Request & { user?: JWTPayload }, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' })
    return
  }

  const user = await User.findOne({ username, isActive: true })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const payload: JWTPayload = {
    userId: user._id.toString(),
    role: user.role,
    facultyId: user.facultyId?.toString(),
    batchId: user.batchId?.toString(),
  }

  const accessToken = signAccess(payload)
  const refreshToken = signRefresh(payload)

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  res.json({ accessToken, role: user.role, userId: payload.userId, facultyId: payload.facultyId, batchId: payload.batchId })
})

export const logout = asyncHandler(async (_req: Request & { user?: JWTPayload }, res: Response) => {
  res.clearCookie('refreshToken')
  res.json({ success: true })
})

export const refresh = asyncHandler(async (req: Request & { user?: JWTPayload }, res: Response) => {
  const token = (req as Request & { cookies: Record<string, string> }).cookies?.refreshToken
  if (!token) {
    res.status(401).json({ error: 'No refresh token' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload
    const accessToken = signAccess({ userId: payload.userId, role: payload.role, facultyId: payload.facultyId, batchId: payload.batchId })
    res.json({ accessToken })
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

/**
 * POST /auth/change-password — authenticated users change their own password.
 * HR can also change any user's password via this same endpoint by passing userId in the body;
 * non-HR callers are silently restricted to their own account.
 */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword, userId: targetUserId } = req.body

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' }); return
  }

  // Determine which account to update
  // HR_MANAGER and ADMIN can change any user's password; others are restricted to their own
  const canChangeOthers = req.user!.role === 'HR_MANAGER' || req.user!.role === 'ADMIN'
  const resolvedUserId = canChangeOthers && targetUserId ? targetUserId : req.user!.userId

  const user = await User.findById(resolvedUserId)
  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  // If changing own password, require current password verification
  if (resolvedUserId === req.user!.userId) {
    if (!currentPassword) {
      res.status(400).json({ error: 'currentPassword is required to change your own password' }); return
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' }); return
    }
  }

  const salt = await bcrypt.genSalt(12)
  user.passwordHash = await bcrypt.hash(newPassword, salt)
  await user.save()

  res.json({ success: true, message: 'Password changed successfully' })
})
