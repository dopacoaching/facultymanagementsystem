import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Batch } from '@/lib/models/Batch'
import { Campus } from '@/lib/models/Campus'
import { writeAuditLog } from '@/lib/services/salary/audit'

const BATCH_TYPES = ['RESIDENTIAL', 'OFFLINE', 'ONLINE', 'IG'] as const

/** GET /api/hr/setup/batches — all batches (active and inactive) plus the campuses they can belong to */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    await connectDB()
    const [batches, campuses] = await Promise.all([
      Batch.find({}).populate('campusId', 'name').sort({ name: 1 }).lean(),
      Campus.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
    ])
    return withToken(json({ batches, campuses }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/setup/batches]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/hr/setup/batches — Body: { name, type, campusId, stream?, ig1Subgroup? } */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const body = await req.json() as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name.length < 2 || name.length > 80) {
      return withToken(json({ error: 'Batch name must be 2–80 characters' }, 400), refreshedToken)
    }
    const type = body.type as (typeof BATCH_TYPES)[number]
    if (!BATCH_TYPES.includes(type)) {
      return withToken(json({ error: `type must be one of: ${BATCH_TYPES.join(', ')}` }, 400), refreshedToken)
    }
    if (typeof body.campusId !== 'string' || !Types.ObjectId.isValid(body.campusId)) {
      return withToken(json({ error: 'Select a campus' }, 400), refreshedToken)
    }
    const campusOid = new Types.ObjectId(body.campusId)
    await connectDB()
    if (!(await Campus.exists({ _id: campusOid }))) {
      return withToken(json({ error: 'Campus not found' }, 404), refreshedToken)
    }
    if (await Batch.exists({ campusId: campusOid, name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })) {
      return withToken(json({ error: 'This campus already has a batch with that name.' }, 409), refreshedToken)
    }

    const batch = await Batch.create({
      name,
      type,
      campusId: campusOid,
      isActive: true,
      ...(type === 'IG' && (body.stream === 'NEET' || body.stream === 'JEE') ? { stream: body.stream } : {}),
      ...(type === 'IG' && (body.ig1Subgroup === 'PLUS_ONE' || body.ig1Subgroup === 'PLUS_TWO') ? { ig1Subgroup: body.ig1Subgroup } : {}),
    })

    await writeAuditLog({
      category: 'ADMIN', eventType: 'USER_ACCOUNT_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Batch', targetId: String(batch._id), targetName: name,
      description: `Batch "${name}" (${type}) added`,
    })
    return withToken(json(await Batch.findById(batch._id).populate('campusId', 'name').lean(), 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/hr/setup/batches]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
