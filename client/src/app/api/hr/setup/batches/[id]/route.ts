import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Batch } from '@/lib/models/Batch'
import { Campus } from '@/lib/models/Campus'
import { Session } from '@/lib/models/Session'
import { writeAuditLog } from '@/lib/services/salary/audit'

const BATCH_TYPES = ['RESIDENTIAL', 'OFFLINE', 'ONLINE', 'IG']

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * PATCH /api/hr/setup/batches/:id — edit a batch.
 * Body (all optional): name, isActive, type, campusId, stream, ig1Subgroup.
 * Type and campus are locked once the batch has entries, so history stays consistent.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    if (!Types.ObjectId.isValid(id)) return withToken(json({ error: 'Invalid batch id' }, 400), refreshedToken)
    const body = await req.json() as Record<string, unknown>

    await connectDB()
    const batch = await Batch.findById(id)
    if (!batch) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)

    const changes: string[] = []

    // Validate campusId up front — it is used in queries below.
    let targetCampusId: Types.ObjectId = batch.campusId
    if (body.campusId !== undefined && String(body.campusId) !== String(batch.campusId)) {
      if (typeof body.campusId !== 'string' || !Types.ObjectId.isValid(body.campusId) || !(await Campus.exists({ _id: new Types.ObjectId(body.campusId) }))) {
        return withToken(json({ error: 'Campus not found' }, 404), refreshedToken)
      }
      targetCampusId = new Types.ObjectId(body.campusId)
    }

    let targetName = batch.name
    if (typeof body.name === 'string') {
      targetName = body.name.trim()
      if (targetName.length < 2 || targetName.length > 80) {
        return withToken(json({ error: 'Batch name must be 2–80 characters' }, 400), refreshedToken)
      }
    }
    if (targetName !== batch.name || !targetCampusId.equals(batch.campusId)) {
      const clash = await Batch.exists({
        _id: { $ne: batch._id }, campusId: targetCampusId,
        name: { $regex: `^${escapeRegex(targetName)}$`, $options: 'i' },
      })
      if (clash) return withToken(json({ error: 'This campus already has a batch with that name.' }, 409), refreshedToken)
    }
    if (targetName !== batch.name) {
      changes.push(`renamed "${batch.name}" → "${targetName}"`)
      batch.name = targetName
    }

    const wantsType = body.type !== undefined && body.type !== batch.type
    const wantsCampus = body.campusId !== undefined && String(body.campusId) !== String(batch.campusId)
    if (wantsType || wantsCampus) {
      const used = await Session.exists({ $or: [{ batchId: batch._id }, { extraBatchIds: batch._id }] })
      if (used) {
        return withToken(json({ error: 'This batch already has entries, so its type and campus can no longer be changed. Deactivate it and add a new batch instead.' }, 409), refreshedToken)
      }
      if (wantsType) {
        if (!BATCH_TYPES.includes(body.type as string)) {
          return withToken(json({ error: `type must be one of: ${BATCH_TYPES.join(', ')}` }, 400), refreshedToken)
        }
        changes.push(`type ${batch.type} → ${body.type}`)
        batch.type = body.type as never
      }
      if (wantsCampus) {
        changes.push('campus changed')
        batch.campusId = targetCampusId
      }
    }

    if (body.stream !== undefined && batch.type === 'IG' && (body.stream === 'NEET' || body.stream === 'JEE') && body.stream !== batch.stream) {
      batch.stream = body.stream
      changes.push(`stream → ${body.stream}`)
    }
    if (body.ig1Subgroup !== undefined && batch.type === 'IG' && (body.ig1Subgroup === 'PLUS_ONE' || body.ig1Subgroup === 'PLUS_TWO') && body.ig1Subgroup !== batch.ig1Subgroup) {
      batch.ig1Subgroup = body.ig1Subgroup
      changes.push(`subgroup → ${body.ig1Subgroup}`)
    }
    if (typeof body.isActive === 'boolean' && body.isActive !== batch.isActive) {
      batch.isActive = body.isActive
      changes.push(body.isActive ? 'activated' : 'deactivated')
    }

    if (changes.length) {
      await batch.save()
      await writeAuditLog({
        category: 'ADMIN', eventType: 'USER_ACCOUNT_UPDATED',
        actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
        targetType: 'Batch', targetId: String(batch._id), targetName: batch.name,
        description: `Batch "${batch.name}" updated: ${changes.join('; ')}`,
      })
    }
    return withToken(json(await Batch.findById(batch._id).populate('campusId', 'name').lean()), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/hr/setup/batches/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
