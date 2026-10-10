import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { User } from '@/lib/models/User'
import { Campus } from '@/lib/models/Campus'
import { PushCampus } from '@/lib/models/PushCampus'
import { cascadeCampusRename, describeCampus, ensureBatchCampus, findLogin } from '@/lib/services/campusSetup'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { validatePasswordComplexity } from '@/lib/utils/passwordUtils'

/**
 * PATCH /api/hr/setup/campuses/:id — edit a campus.
 * Body (all optional): name, isActive, hasBatches (turn on only), username, password.
 * Deactivating also blocks the campus login; reactivating restores it.
 *
 * Everything is validated first; nothing is written until every field is valid,
 * and the campus record itself is saved before any dependent data is touched.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    if (!Types.ObjectId.isValid(id)) return withToken(json({ error: 'Invalid campus id' }, 400), refreshedToken)
    const body = await req.json() as Record<string, unknown>
    const fail = (error: string, status = 400) => withToken(json({ error }, status), refreshedToken)

    await connectDB()
    const campus = await PushCampus.findById(id)
    if (!campus) return fail('Campus not found', 404)
    const login = await findLogin(campus)
    const oldName = campus.name

    // ── 1. Validate everything up front ─────────────────────────────────────
    let newUsername: string | undefined
    if (typeof body.username === 'string' && body.username.trim()) {
      const username = body.username.trim().toLowerCase()
      if (!login) return fail('This campus has no login account yet. Create the account under Admin → Users first.')
      if (username !== login.username) {
        if (await User.exists({ username, _id: { $ne: login._id } })) return fail('That login username is already in use.', 409)
        newUsername = username
      }
    }

    let newPassword: string | undefined
    if (typeof body.password === 'string' && body.password) {
      if (!login) return fail('This campus has no login account to reset.')
      const pwError = validatePasswordComplexity(body.password)
      if (pwError) return fail(pwError)
      newPassword = body.password
    }

    let newName: string | undefined
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 60) return fail('Campus name must be 2–60 characters')
      if (name !== oldName) {
        if (await PushCampus.exists({ name, _id: { $ne: campus._id } })) return fail('A campus with this name already exists.', 409)
        newName = name
      }
    }

    const enableBatches = body.hasBatches === true && !campus.batchCampusId
    const nextActive = typeof body.isActive === 'boolean' && body.isActive !== campus.isActive ? body.isActive : undefined

    const changes: string[] = []
    if (newUsername) changes.push(`login username → ${newUsername}`)
    if (newPassword) changes.push('login password reset')
    if (enableBatches) changes.push('batches enabled')
    if (newName) changes.push(`renamed "${oldName}" → "${newName}"`)
    if (nextActive !== undefined) changes.push(nextActive ? 'activated' : 'deactivated')
    if (changes.length === 0) return withToken(json(await describeCampus(campus)), refreshedToken)

    // ── 2. Save the campus record first (the one step that can race) ────────
    let createdBatchCampus: Types.ObjectId | null = null
    try {
      if (enableBatches) {
        const bc = await ensureBatchCampus(newName ?? oldName)
        if ('conflict' in bc) return fail(bc.conflict, 409)
        campus.batchCampusId = bc._id
        if (bc.created) createdBatchCampus = bc._id
      }
      if (newName) campus.name = newName
      if (nextActive !== undefined) campus.isActive = nextActive
      await campus.save()
    } catch (e) {
      if (createdBatchCampus) await Campus.deleteOne({ _id: createdBatchCampus }).catch(() => null)
      throw e
    }

    // ── 3. Dependent data — only after the campus saved successfully ────────
    if (newName) {
      if (campus.batchCampusId) {
        const bc = await Campus.findById(campus.batchCampusId)
        if (bc && bc.name === oldName && !(await Campus.exists({ name: newName, _id: { $ne: bc._id } }))) {
          bc.name = newName
          await bc.save()
        }
      }
      await cascadeCampusRename(oldName, newName, campus.kind)
    }
    if (login) {
      const set: Record<string, unknown> = {}
      if (newUsername) set.username = newUsername
      if (newPassword) set.passwordHash = await bcrypt.hash(newPassword, 12)
      if (nextActive !== undefined) set.isActive = nextActive
      if (Object.keys(set).length) await User.updateOne({ _id: login._id }, { $set: set })
    }

    await writeAuditLog({
      category: 'ADMIN', eventType: 'USER_ACCOUNT_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Campus', targetId: String(campus._id), targetName: campus.name,
      description: `Campus "${campus.name}" updated: ${changes.join('; ')}`,
      metadata: { changes },
    })

    return withToken(json(await describeCampus(campus)), refreshedToken)
  } catch (err: unknown) {
    const e = err as { name?: string; code?: number | string }
    if (e.name === 'MongoServerError' && e.code === 11000) {
      return NextResponse.json({ error: 'Duplicate entry — a record with that value already exists.' }, { status: 409 })
    }
    console.error('[PATCH /api/hr/setup/campuses/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
