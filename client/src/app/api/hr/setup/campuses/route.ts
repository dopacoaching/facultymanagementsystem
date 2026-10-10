import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { User } from '@/lib/models/User'
import { Campus } from '@/lib/models/Campus'
import { PushCampus } from '@/lib/models/PushCampus'
import { ensurePushCampusesSeeded } from '@/lib/services/pushCampuses'
import { describeCampus, ensureBatchCampus } from '@/lib/services/campusSetup'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { validatePasswordComplexity } from '@/lib/utils/passwordUtils'

/** GET /api/hr/setup/campuses — every Push Board campus (active and inactive) */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    await connectDB()
    await ensurePushCampusesSeeded()
    const campuses = await PushCampus.find({}).sort({ name: 1 }).lean()
    return withToken(json(await Promise.all(campuses.map((c) => describeCampus(c as never)))), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/setup/campuses]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hr/setup/campuses — add a Push Board campus together with its
 * shared teacher login. Body: { name, kind?, hasBatches?, location?, teachers?, username, password }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const body = await req.json() as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const kind = body.kind === 'IG' ? 'IG' : 'CAMPUS'
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const location = typeof body.location === 'string' ? body.location.trim() : undefined
    // IG schools always need batches; other campuses opt in.
    const hasBatches = kind === 'IG' || body.hasBatches === true
    const teachers = Array.isArray(body.teachers)
      ? Array.from(new Set(body.teachers.map((t) => String(t).trim()).filter(Boolean))).slice(0, 50)
      : []

    if (name.length < 2 || name.length > 60) {
      return withToken(json({ error: 'Campus name must be 2–60 characters' }, 400), refreshedToken)
    }
    if (!username) return withToken(json({ error: 'A login username is required' }, 400), refreshedToken)
    const pwError = validatePasswordComplexity(password)
    if (pwError) return withToken(json({ error: pwError }, 400), refreshedToken)

    await connectDB()
    await ensurePushCampusesSeeded()

    if (await PushCampus.exists({ name })) {
      return withToken(json({ error: 'A campus with this name already exists.' }, 409), refreshedToken)
    }
    if (await User.exists({ username })) {
      return withToken(json({ error: 'That login username is already in use.' }, 409), refreshedToken)
    }

    let batchCampus: { _id: Types.ObjectId; created: boolean } | null = null
    let campusDoc: InstanceType<typeof PushCampus> | null = null
    try {
      if (hasBatches) {
        const bc = await ensureBatchCampus(name, location)
        if ('conflict' in bc) return withToken(json({ error: bc.conflict }, 409), refreshedToken)
        batchCampus = bc
      }
      campusDoc = new PushCampus({
        name, kind,
        teachers: teachers.map((t) => ({ name: t, isActive: true })),
        batchCampusId: batchCampus?._id,
        isActive: true,
      })
      await campusDoc.save()
      await User.create({
        username,
        passwordHash: await bcrypt.hash(password, 12),
        role: kind === 'IG' ? 'IG_CLASS_TEACHER' : 'CLASS_TEACHER',
        ...(kind === 'IG' ? { campusId: batchCampus?._id } : { campusName: name }),
      })
    } catch (e) {
      // Roll back whatever was created so a failed add leaves nothing half-made.
      if (campusDoc) await PushCampus.deleteOne({ _id: campusDoc._id }).catch(() => null)
      if (batchCampus?.created) await Campus.deleteOne({ _id: batchCampus._id }).catch(() => null)
      throw e
    }

    await writeAuditLog({
      category: 'ADMIN', eventType: 'USER_ACCOUNT_CREATED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Campus', targetId: String(campusDoc._id), targetName: name,
      description: `Campus "${name}" added with login "${username}"${hasBatches ? ' (with batches)' : ''}`,
      metadata: { kind, hasBatches, teachers },
    })

    return withToken(json(await describeCampus(campusDoc), 201), refreshedToken)
  } catch (err: unknown) {
    const e = err as { name?: string; code?: number | string }
    if (e.name === 'MongoServerError' && e.code === 11000) {
      return NextResponse.json({ error: 'Duplicate entry — a record with that value already exists.' }, { status: 409 })
    }
    console.error('[POST /api/hr/setup/campuses]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
