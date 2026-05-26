import { Response } from 'express'
import bcrypt from 'bcrypt'
import { AuthRequest } from '../middleware/auth'
import { User } from '../models/User'
import { Faculty } from '../models/Faculty'
import { Batch } from '../models/Batch'
import { asyncHandler } from '../utils/asyncHandler'
import { UserRole } from '../types'

const VALID_ROLES: UserRole[] = [
  'HR_MANAGER', 'ACADEMICS_MANAGER', 'IS_ACADEMICS_MANAGER',
  'COORDINATOR', 'IS_COORDINATOR', 'FACULTY',
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
  if (!password || password.length < 6) {
    res.status(400).json({ error: 'password must be at least 6 characters' }); return
  }
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

  if (req.body.isActive !== undefined)  update.isActive = Boolean(req.body.isActive)
  if (req.body.batchId  !== undefined)  update.batchId  = req.body.batchId  || undefined

  if (req.body.role) {
    if (![...VALID_ROLES, 'ADMIN'].includes(req.body.role)) {
      res.status(400).json({ error: 'Invalid role' }); return
    }
    update.role = req.body.role
  }

  if (req.body.password) {
    if (req.body.password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' }); return
    }
    update.passwordHash = await bcrypt.hash(req.body.password, 12)
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' }); return
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true })
    .select('-passwordHash')
    .populate('facultyId', 'name subject')
    .populate('batchId', 'name type')

  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  res.json(user)
})
