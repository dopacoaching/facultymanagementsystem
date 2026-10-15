import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { isEntryType, shootHours } from '@/lib/constants/entryTypes'

/** PATCH /api/academics/sessions/:id — full edit (manager only) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid sessionId' }, 400), refreshedToken)
    }

    const body = await req.json() as Record<string, unknown>
    const allowed = [
      'facultyId', 'batchId', 'campusName', 'classMode', 'subject', 'chapter',
      'scheduledTime', 'scheduledEndTime', 'updatedByName', 'startTime', 'endTime',
      'breakMinutes', 'lunchBreakMinutes', 'afternoonBreakMinutes',
      'durationHours', 'sessionDate', 'timeSlot',
    ]
    const update: Record<string, unknown> = {}
    const unset: Record<string, ''> = {}

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

    if (body.entryType !== undefined && !isEntryType(body.entryType)) {
      return withToken(json({ error: 'entryType must be LIVE or SHOOT' }, 400), refreshedToken)
    }

    await connectDB()

    const existing = await Session.findById(oid)
    if (!existing) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)
    if (existing.status === 'CANCELLED') {
      return withToken(json({ error: 'Cannot edit a cancelled session' }, 409), refreshedToken)
    }

    // Live/Shoot (Studio): durationHours arrives as the time actually taken and is
    // stored multiplied for a Shoot; rawDurationHours keeps the real time.
    if (existing.entryType || body.entryType !== undefined) {
      const type = (body.entryType ?? existing.entryType) as 'LIVE' | 'SHOOT'
      const raw = body.durationHours !== undefined
        ? Number(body.durationHours)
        : (existing.rawDurationHours ?? existing.durationHours)
      if (!(raw >= 0.5)) {
        return withToken(json({ error: 'durationHours must be at least 0.5 (30 minutes)' }, 400), refreshedToken)
      }
      update.entryType = type
      update.durationHours = type === 'SHOOT' ? shootHours(raw) : raw
      if (type === 'SHOOT') update.rawDurationHours = raw
      else unset.rawDurationHours = ''
    }

    if (Object.keys(update).length === 0) {
      return withToken(json({ error: 'No valid fields provided for update' }, 400), refreshedToken)
    }

    const session = await Session.findByIdAndUpdate(
      oid,
      { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true },
    ).populate('facultyId', 'name subject')
    if (!session) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SESSION_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Session', targetId: id,
      targetName: session.chapter ? `${session.subject} — ${session.chapter}` : session.subject,
      description: session.chapter
        ? `Session updated: ${session.subject} "${session.chapter}"`
        : `Session updated: ${session.subject}`,
      metadata: { updated: Object.keys(update) },
    }).catch(() => null)

    return withToken(json(session), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/sessions/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
