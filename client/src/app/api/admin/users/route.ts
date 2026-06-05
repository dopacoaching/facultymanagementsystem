import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { User } from '@/lib/models/User'
import { Faculty } from '@/lib/models/Faculty'
import { Batch } from '@/lib/models/Batch'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { validatePasswordComplexity } from '@/lib/utils/passwordUtils'
import type { UserRole } from '@/lib/types'

const VALID_ROLES: UserRole[] = [
  'HR_MANAGER', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER',
  'COORDINATOR', 'IG_COORDINATOR', 'FACULTY',
]

/** GET /api/admin/users — list all users */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    await connectDB()

    const users = await User.find({})
      .select('-passwordHash')
      .populate('facultyId', 'name subject')
      .populate('batchId',   'name type')
      .sort({ role: 1, username: 1 })

    return withToken(json(users), refreshedToken)
  } catch (err) {
    console.error('[GET /api/admin/users]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/admin/users — create a new user account */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { username, password, role, facultyId, batchId, batchType } = await req.json()

    if (!username?.trim()) {
      return withToken(json({ error: 'username is required' }, 400), refreshedToken)
    }
    const pwError = validatePasswordComplexity(password)
    if (pwError) return withToken(json({ error: pwError }, 400), refreshedToken)

    if (!role || ![...VALID_ROLES, 'ADMIN'].includes(role)) {
      return withToken(json({
        error: `role must be one of: ${[...VALID_ROLES, 'ADMIN'].join(', ')}`,
      }, 400), refreshedToken)
    }

    await connectDB()

    // Validate optional references
    if (facultyId) {
      const fac = await Faculty.findById(facultyId)
      if (!fac) return withToken(json({ error: 'facultyId does not exist' }, 400), refreshedToken)
    }
    if (batchId) {
      const bat = await Batch.findById(batchId)
      if (!bat) return withToken(json({ error: 'batchId does not exist' }, 400), refreshedToken)
    }

    const VALID_BATCH_TYPES = ['RESIDENTIAL', 'OFFLINE', 'ONLINE']
    if (batchType && !VALID_BATCH_TYPES.includes(batchType)) {
      return withToken(json({ error: 'batchType must be RESIDENTIAL, OFFLINE, or ONLINE' }, 400), refreshedToken)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      username:     username.trim().toLowerCase(),
      passwordHash,
      role,
      facultyId:    facultyId || undefined,
      batchId:      batchId   || undefined,
      batchType:    role === 'ACADEMICS_MANAGER' && batchType ? batchType : undefined,
    })

    // Audit: user account created
    await writeAuditLog({
      category: 'ADMIN', eventType: 'USER_ACCOUNT_CREATED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'User', targetId: user._id.toString(), targetName: username.trim().toLowerCase(),
      description: `User account created: "${username.trim().toLowerCase()}" with role ${role}`,
      metadata: { role, facultyId, batchId },
    })

    const safe = await User.findById(user._id)
      .select('-passwordHash')
      .populate('facultyId', 'name subject')
      .populate('batchId',   'name type')

    return withToken(json(safe, 201), refreshedToken)
  } catch (err: unknown) {
    const e = err as { name?: string; code?: number | string }
    if (e.name === 'MongoServerError' && e.code === 11000) {
      return NextResponse.json({ error: 'Duplicate entry — a record with that value already exists.' }, { status: 409 })
    }
    console.error('[POST /api/admin/users]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
