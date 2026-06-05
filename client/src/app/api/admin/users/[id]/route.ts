import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { User } from '@/lib/models/User'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { validatePasswordComplexity } from '@/lib/utils/passwordUtils'
import type { UserRole } from '@/lib/types'

const VALID_ROLES: UserRole[] = [
  'HR_MANAGER', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER',
  'COORDINATOR', 'IG_COORDINATOR', 'FACULTY',
]

/** PATCH /api/admin/users/:id — update a user (password reset, activate/deactivate, role change) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    const body = await req.json() as Record<string, unknown>

    // Prevent admins from locking themselves out
    if (id === payload.userId && body.isActive === false) {
      return withToken(json({ error: 'You cannot deactivate your own account' }, 400), refreshedToken)
    }

    const update: Record<string, unknown> = {}
    const auditReasons: string[] = []

    if (body.isActive !== undefined) {
      update.isActive = Boolean(body.isActive)
      auditReasons.push(`isActive → ${update.isActive}`)
    }
    if (body.batchId !== undefined) {
      update.batchId = body.batchId || undefined
      auditReasons.push('batchId updated')
    }
    if ('batchType' in body) {
      update.batchType = body.batchType || undefined
      auditReasons.push(`batchType → ${body.batchType || 'none'}`)
    }

    if (body.role) {
      if (![...VALID_ROLES, 'ADMIN'].includes(body.role as string)) {
        return withToken(json({ error: 'Invalid role' }, 400), refreshedToken)
      }
      update.role = body.role
      auditReasons.push(`role → ${body.role}`)
    }

    if (body.password) {
      const pwError = validatePasswordComplexity(body.password as string)
      if (pwError) return withToken(json({ error: pwError }, 400), refreshedToken)
      update.passwordHash = await bcrypt.hash(body.password as string, 12)
      auditReasons.push('password reset')
    }

    if (Object.keys(update).length === 0) {
      return withToken(json({ error: 'No valid fields to update' }, 400), refreshedToken)
    }

    await connectDB()

    const user = await User.findByIdAndUpdate(id, update, { new: true })
      .select('-passwordHash')
      .populate('facultyId', 'name subject')
      .populate('batchId',   'name type')

    if (!user) return withToken(json({ error: 'User not found' }, 404), refreshedToken)

    // Revoke all refresh tokens when account is deactivated or role changes
    // so the user cannot silently regain access via a stored cookie
    if (update.isActive === false || update.role) {
      await (await import('@/lib/models/RefreshToken')).RefreshToken.deleteMany({ userId: id })
    }

    // Audit: user account changed
    await writeAuditLog({
      category: 'ADMIN', eventType: 'USER_ACCOUNT_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'User', targetId: String(id), targetName: user.username,
      description: `User account updated: "${user.username}" — ${auditReasons.join(', ')}`,
      metadata: { changes: auditReasons },
    })

    return withToken(json(user), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/admin/users/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/admin/users/:id — not in original routes but kept as 405 */
export async function DELETE(_req: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed — use PATCH to deactivate' }, { status: 405 })
}
