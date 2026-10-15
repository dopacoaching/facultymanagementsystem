import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { Batch } from '@/lib/models/Batch'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { isEntryType } from '@/lib/constants/entryTypes'
import { canTeacherEdit, EDIT_WINDOW_CLOSED_MESSAGE, TEACHER_EDITABLE_FIELDS } from '@/lib/utils/teacherEdit'

/** PATCH /api/ig/sessions/:id — full edit (HR/Admin). An IG class teacher may correct an
 *  entry for their own school for 24 hours after it was pushed. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN', 'IG_CLASS_TEACHER')
    const isTeacher = payload.role === 'IG_CLASS_TEACHER'
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid sessionId' }, 400), refreshedToken)
    }

    const body = await req.json() as Record<string, unknown>
    const allowed: readonly string[] = isTeacher ? TEACHER_EDITABLE_FIELDS : [
      'facultyId', 'batchId', 'subject', 'chapter', 'timeSlot',
      'scheduledTime', 'scheduledEndTime', 'startTime', 'endTime', 'updatedByName',
      'breakMinutes', 'lunchBreakMinutes', 'afternoonBreakMinutes',
      'durationHours', 'sessionDate',
    ]
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
    if (isTeacher) {
      const batch = existing.batchId ? await Batch.findById(existing.batchId).select('campusId type') : null
      if (!payload.campusId || !batch || batch.type !== 'IG' || batch.campusId.toString() !== payload.campusId) {
        return withToken(json({ error: 'You can only edit entries for your own school.' }, 403), refreshedToken)
      }
      if (!canTeacherEdit(existing.createdAt)) {
        return withToken(json({ error: EDIT_WINDOW_CLOSED_MESSAGE }, 403), refreshedToken)
      }
      if (update.sessionDate instanceof Date && update.sessionDate.getTime() > Date.now()) {
        return withToken(json({ error: 'The date cannot be in the future' }, 400), refreshedToken)
      }
      if (body.entryType !== undefined && !isEntryType(body.entryType)) {
        return withToken(json({ error: 'entryType must be LIVE or SHOOT' }, 400), refreshedToken)
      }
    }

    const session = await Session.findByIdAndUpdate(oid, update, { new: true, runValidators: true })
      .populate('facultyId', 'name subject')
    if (!session) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SESSION_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Session', targetId: id,
      targetName: session.chapter ? `${session.subject} — ${session.chapter}` : session.subject,
      description: `IG session updated${isTeacher ? ' by class teacher' : ''}: ${session.subject}`,
      metadata: { updated: Object.keys(update) },
    }).catch(() => null)

    return withToken(json(session), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/ig/sessions/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
