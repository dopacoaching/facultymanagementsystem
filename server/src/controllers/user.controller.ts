import { Response } from 'express'
import bcrypt from 'bcrypt'
import { AuthRequest } from '../middleware/auth'
import { User } from '../models/User'
import { Faculty } from '../models/Faculty'
import { Batch } from '../models/Batch'
import { RefreshToken } from '../models/RefreshToken'
import { asyncHandler } from '../utils/asyncHandler'
import { validatePasswordComplexity } from '../utils/passwordUtils'
import { writeAuditLog } from '../services/salary/audit'
import { UserRole } from '../types'

// Re-export so auth.controller can still import from here without breaking callers.
export { validatePasswordComplexity }

const VALID_ROLES: UserRole[] = [
  'HR_MANAGER', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER',
  'COORDINATOR', 'IG_COORDINATOR', 'FACULTY',
]

/** GET /admin/users — list all users (password hash excluded) */
export const getUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const users = await User.find({})
    .select('-passwordHash')
    .populate('facultyId', 'name subject')
    .populate('batchId', 'name type')
    .sort({ role: 1, username: 1 })
  res.json(users)
})

/** POST /admin/users — create a new user account */
export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { username, password, role, facultyId, batchId } = req.body

  if (!username?.trim()) {
    res.status(400).json({ error: 'username is required' }); return
  }
  const pwError = validatePasswordComplexity(password)
  if (pwError) { res.status(400).json({ error: pwError }); return }
  if (!role || ![...VALID_ROLES, 'ADMIN'].includes(role)) {
    res.status(400).json({ error: `role must be one of: ${[...VALID_ROLES, 'ADMIN'].join(', ')}` }); return
  }

  // Validate optional references
  if (facultyId) {
    const fac = await Faculty.findById(facultyId)
    if (!fac) { res.status(400).json({ error: 'facultyId does not exist' }); return }
  }
  if (batchId) {
    const bat = await Batch.findById(batchId)
    if (!bat) { res.status(400).json({ error: 'batchId does not exist' }); return }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({
    username: username.trim().toLowerCase(),
    passwordHash,
    role,
    facultyId: facultyId || undefined,
    batchId:   batchId   || undefined,
  })

  // Audit: user account created
  await writeAuditLog({
    category: 'ADMIN', eventType: 'USER_ACCOUNT_CREATED',
    actorUserId: req.user!.userId, actorRole: req.user!.role,
    targetType: 'User', targetId: user._id.toString(),
    targetName: username.trim().toLowerCase(),
    description: `User account created with role ${role} by admin ${req.user!.userId}`,
  })

  // Return without the password hash
  const safe = await User.findById(user._id)
    .select('-passwordHash')
    .populate('facultyId', 'name subject')
    .populate('batchId', 'name type')

  res.status(201).json(safe)
})

/** PATCH /admin/users/:id — update a user (password reset, activate/deactivate, role change) */
export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  // Prevent admins from locking themselves out
  if (id === req.user!.userId && req.body.isActive === false) {
    res.status(400).json({ error: 'You cannot deactivate your own account' }); return
  }

  const update: Record<string, unknown> = {}
  const auditReasons: string[] = []

  if (req.body.isActive !== undefined) {
    update.isActive = Boolean(req.body.isActive)
    auditReasons.push(`isActive → ${update.isActive}`)
  }
  if (req.body.batchId !== undefined) {
    update.batchId = req.body.batchId || undefined
    auditReasons.push(`batchId updated`)
  }

  if (req.body.role) {
    if (![...VALID_ROLES, 'ADMIN'].includes(req.body.role)) {
      res.status(400).json({ error: 'Invalid role' }); return
    }
    update.role = req.body.role
    auditReasons.push(`role → ${req.body.role}`)
  }

  if (req.body.password) {
    const pwError = validatePasswordComplexity(req.body.password)
    if (pwError) { res.status(400).json({ error: pwError }); return }
    update.passwordHash = await bcrypt.hash(req.body.password, 12)
    auditReasons.push('password reset')
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' }); return
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true })
    .select('-passwordHash')
    .populate('facultyId', 'name subject')
    .populate('batchId', 'name type')

  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  // Revoke all refresh tokens when role changes, password is reset, or account is deactivated
  // so the user cannot silently continue using a stale session with old privileges.
  if (update.role || update.passwordHash || update.isActive === false) {
    await RefreshToken.deleteMany({ userId: id }).catch(() => null)
  }

  // Audit: user account changed
  await writeAuditLog({
    category: 'ADMIN', eventType: 'USER_ACCOUNT_UPDATED',
    actorUserId: req.user!.userId, actorRole: req.user!.role,
    targetType: 'User', targetId: String(id),
    targetName: user.username,
    description: `User account updated: ${auditReasons.join(', ')} — by admin ${req.user!.userId}`,
  })

  res.json(user)
})
