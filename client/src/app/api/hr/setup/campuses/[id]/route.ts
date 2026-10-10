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

    await connectDB()
    const campus = await PushCampus.findById(id)
    if (!campus) return withToken(json({ error: 'Campus not found' }, 404), refreshedToken)

    const changes: string[] = []
    const login = await findLogin(campus)

    // ── Login: username / password ──────────────────────────────────────────
    if (typeof body.username === 'string' && body.username.trim()) {
      const username = body.username.trim().toLowerCase()
      if (!login) {
        return withToken(json({ error: 'This campus has no login account yet. Create the account under Admin → Users first.' }, 400), refreshedToken)
      }
      if (username !== login.username) {
        if (await User.exists({ username, _id: { $ne: login._id } })) {
          return withToken(json({ error: 'That login username is already in use.' }, 409), refreshedToken)
        }
        await User.updateOne({ _id: login._id }, { $set: { username } })
        changes.push(`login username → ${username}`)
      }
    }
    if (typeof body.password === 'string' && body.password) {
      if (!login) return withToken(json({ error: 'This campus has no login account to reset.' }, 400), refreshedToken)
      const pwError = validatePasswordComplexity(body.password)
      if (pwError) return withToken(json({ error: pwError }, 400), refreshedToken)
      await User.updateOne({ _id: login._id }, { $set: { passwordHash: await bcrypt.hash(body.password, 12) } })
      changes.push('login password reset')
    }

    // ── Batches on ──────────────────────────────────────────────────────────
    if (body.hasBatches === true && !campus.batchCampusId) {
      if (await Campus.exists({ name: campus.name })) {
        return withToken(json({ error: 'A batch campus with this name already exists.' }, 409), refreshedToken)
      }
      const bc = await ensureBatchCampus(campus.name)
      campus.batchCampusId = bc._id as Types.ObjectId
      changes.push('batches enabled')
      // The login for a CAMPUS needs no change: it finds its batches through the campus record.
    }

    // ── Rename (cascades to the name stored on entries, No Class days, logins) ─
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 60) {
        return withToken(json({ error: 'Campus name must be 2–60 characters' }, 400), refreshedToken)
      }
      if (name !== campus.name) {
        if (await PushCampus.exists({ name, _id: { $ne: campus._id } })) {
          return withToken(json({ error: 'A campus with this name already exists.' }, 409), refreshedToken)
        }
        const old = campus.name
        // Keep the batch campus's display name in step when it carried the same name.
        if (campus.batchCampusId) {
          const bc = await Campus.findById(campus.batchCampusId)
          if (bc && bc.name === old && !(await Campus.exists({ name, _id: { $ne: bc._id } }))) {
            bc.name = name
            await bc.save()
          }
        }
        campus.name = name
        await cascadeCampusRename(old, name, campus.kind)
        changes.push(`renamed "${old}" → "${name}"`)
      }
    }

    // ── Active / inactive ───────────────────────────────────────────────────
    if (typeof body.isActive === 'boolean' && body.isActive !== campus.isActive) {
      campus.isActive = body.isActive
      if (login) await User.updateOne({ _id: login._id }, { $set: { isActive: body.isActive } })
      changes.push(body.isActive ? 'activated' : 'deactivated')
    }

    if (changes.length === 0) {
      return withToken(json(await describeCampus(campus)), refreshedToken)
    }
    await campus.save()

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
