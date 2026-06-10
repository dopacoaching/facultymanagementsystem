import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { Batch } from '@/lib/models/Batch'

/** PATCH /api/ig/sessions/:id — full edit (manager only) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid sessionId' }, 400), refreshedToken)
    }

    const body = await req.json() as Record<string, unknown>
    const allowed = ['facultyId', 'batchId', 'subject', 'chapter', 'startTime', 'durationHours', 'sessionDate', 'timeSlot']
    const update: Record<string, unknown> = {}

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'sessionDate') {
          const d = new Date(body[key] as string)
          if (isNaN(d.getTime())) {
            return withToken(json({ error: 'Invalid sessionDate' }, 400), refreshedToken)
          }
          update[key] = d
        } else if (key === 'facultyId' || key === 'batchId') {
          try { update[key] = new Types.ObjectId(body[key] as string) } catch {
            return withToken(json({ error: `Invalid ${key}` }, 400), refreshedToken)
          }
        } else {
          update[key] = body[key]
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return withToken(json({ error: 'No valid fields provided for update' }, 400), refreshedToken)
    }

    await connectDB()

    const existing = await Session.findById(oid)
    if (!existing) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)
    if (existing.status === 'CANCELLED') {
      return withToken(json({ error: 'Cannot edit a cancelled session' }, 409), refreshedToken)
    }

    // Cross-system lock: re-check Repeaters conflicts when faculty or date changes
    if ('facultyId' in update || 'sessionDate' in update) {
      const effectiveFacultyId = (update.facultyId ?? existing.facultyId) as Types.ObjectId
      const effectiveDate = new Date((update.sessionDate as Date | undefined) ?? existing.sessionDate)
      effectiveDate.setHours(0, 0, 0, 0)
      const dayStart = new Date(effectiveDate)
      const dayEnd   = new Date(effectiveDate); dayEnd.setHours(23, 59, 59, 999)

      const repeatersBatchIds = await Batch.find({ type: { $ne: 'IG' } }).distinct('_id')
      const repeatersConflict = await Session.findOne({
        _id:         { $ne: oid },
        facultyId:   effectiveFacultyId,
        batchId:     { $in: repeatersBatchIds },
        sessionDate: { $gte: dayStart, $lte: dayEnd },
        status:      { $ne: 'CANCELLED' },
      })
      if (repeatersConflict) {
        return withToken(json({
          error: 'Faculty has a Repeaters session on this date and cannot be scheduled in IG on the same day.',
          code:  'CROSS_SYSTEM_CONFLICT',
        }, 409), refreshedToken)
      }
    }

    const session = await Session.findByIdAndUpdate(oid, update, { new: true, runValidators: true })
      .populate('facultyId', 'name subject')
    if (!session) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)

    return withToken(json(session), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/ig/sessions/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
