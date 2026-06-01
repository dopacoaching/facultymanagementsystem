import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { User } from '../models/User'
import { RefreshToken, hashToken } from '../models/RefreshToken'
import { JWTPayload } from '../types'
import { asyncHandler } from '../utils/asyncHandler'
import { AuthRequest } from '../middleware/auth'
import { validatePasswordComplexity } from '../utils/passwordUtils'

/** Inactivity window — 30 minutes.  Exported so authenticate() can import it. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000

/** How long a refresh token lives (must match JWT_REFRESH_EXPIRES_IN). */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

const signAccess = (p: JWTPayload) =>
  jwt.sign({ ...p, lastActive: Date.now() }, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' } as object)

const signRefresh = (p: JWTPayload) =>
  jwt.sign(p, process.env.JWT_REFRESH_SECRET!, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d' } as object)

/**
 * Shared cookie options for the httpOnly refreshToken cookie.
 *
 * Cross-site note: in production the client (Netlify) and API (Render) are on
 * different domains, so the cookie must use sameSite='none' + secure=true or the
 * browser will refuse to send it on the cross-origin /auth/refresh request.
 * In development (same localhost) sameSite='lax' keeps things simple over HTTP.
 */
const isProduction = process.env.NODE_ENV === 'production'
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,                              // HTTPS required for sameSite='none'
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  // Restrict to the auth namespace so the cookie isn't sent on every API call.
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_TTL_MS,
}

export const login = asyncHandler(async (req: Request & { user?: JWTPayload }, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' })
    return
  }

  // createUser stores usernames lowercased+trimmed — normalise the login input the
  // same way so an account created with any uppercase letters can still sign in.
  const user = await User.findOne({ username: String(username).trim().toLowerCase(), isActive: true })
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

  const accessToken  = signAccess(payload)
  const refreshToken = signRefresh(payload)

  // Store a hash of the refresh token so we can revoke it on logout.
  // The raw token goes only into the httpOnly cookie; never into the DB.
  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    userId:    user._id,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  })

  res.cookie('refreshToken', refreshToken, refreshCookieOptions)
  res.json({ accessToken, role: user.role, userId: payload.userId, facultyId: payload.facultyId, batchId: payload.batchId })
})

export const logout = asyncHandler(async (req: Request & { user?: JWTPayload }, res: Response) => {
  // Delete the stored token hash to revoke this session server-side.
  const raw = (req as Request & { cookies: Record<string, string> }).cookies?.refreshToken
  if (raw) {
    await RefreshToken.deleteOne({ tokenHash: hashToken(raw) }).catch(() => null)
  }
  res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: undefined })
  res.json({ success: true })
})

export const refresh = asyncHandler(async (req: Request & { user?: JWTPayload }, res: Response) => {
  const raw = (req as Request & { cookies: Record<string, string> }).cookies?.refreshToken
  if (!raw) {
    res.status(401).json({ error: 'No refresh token' })
    return
  }

  // Check that this token hasn't been revoked.
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(raw) })
  if (!stored) {
    res.status(401).json({ error: 'Refresh token revoked or expired' })
    return
  }

  try {
    const payload = jwt.verify(raw, process.env.JWT_REFRESH_SECRET!) as JWTPayload

    // ── Token rotation: delete the old token and issue a new one ─────────────
    // This limits the damage of a stolen token — each token can only be used once.
    await RefreshToken.deleteOne({ tokenHash: hashToken(raw) })

    const newRefreshToken = signRefresh({
      userId: payload.userId, role: payload.role,
      facultyId: payload.facultyId, batchId: payload.batchId,
    })
    await RefreshToken.create({
      tokenHash: hashToken(newRefreshToken),
      userId:    stored.userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    })

    // Re-stamp lastActive so the session inactivity clock resets on refresh
    const accessToken = signAccess({
      userId: payload.userId, role: payload.role,
      facultyId: payload.facultyId, batchId: payload.batchId,
    })

    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions)
    res.json({ accessToken })
  } catch {
    // JWT verify failed (expired or tampered)
    await RefreshToken.deleteOne({ tokenHash: hashToken(raw) }).catch(() => null)
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

  const pwError = validatePasswordComplexity(newPassword)
  if (pwError) { res.status(400).json({ error: pwError }); return }

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

  // Invalidate all existing refresh tokens for this user so other devices are signed out.
  await RefreshToken.deleteMany({ userId: user._id })

  res.json({ success: true, message: 'Password changed successfully' })
})
