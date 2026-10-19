import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { isEntryType, shootHours, usesFullBreak } from '@/lib/constants/entryTypes'
import { fullBreakHours } from '@/lib/utils/sessionHours'
import { unlistedInChapterText, unlistedChapterMessage } from '@/lib/services/chapterRules'
import { resolveTeacherBatchEdit } from '@/lib/utils/extraBatches'
import { resolveCoordinatorCampusName } from '@/lib/utils/coordinatorCampus'
import { canTeacherEdit, EDIT_WINDOW_CLOSED_MESSAGE, normalizeComment, TEACHER_EDITABLE_FIELDS } from '@/lib/utils/teacherEdit'

/** PATCH /api/academics/sessions/:id — full edit (HR/Admin). A campus class teacher may
 *  correct their own campus's entry for 24 hours after it was pushed. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN', 'CLASS_TEACHER')
    const isTeacher = payload.role === 'CLASS_TEACHER'
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid sessionId' }, 400), refreshedToken)
    }

    const body = await req.json() as Record<string, unknown>
    const allowed: readonly string[] = isTeacher ? TEACHER_EDITABLE_FIELDS : [
      'facultyId', 'batchId', 'campusName', 'classMode', 'subject', 'chapter',
      'scheduledTime', 'scheduledEndTime', 'updatedByName', 'comment', 'startTime', 'endTime',
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
        } else if (key === 'comment') {
          const v = normalizeComment(body[key])
          if (v === null) return withToken(json({ error: 'comment must be text' }, 400), refreshedToken)
          update[key] = v
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
    if (isTeacher && typeof update.chapter === 'string' && update.chapter !== existing.chapter) {
      const subj = String(update.subject ?? existing.subject)
      const bad = await unlistedInChapterText(subj, update.chapter)
      if (bad.length) return withToken(json({ error: unlistedChapterMessage(subj, bad) }, 400), refreshedToken)
    }
    // Edited chapter text no longer matches the stored list of names.
    if (update.chapter !== undefined && update.chapter !== existing.chapter) unset.chapters = ''
    if (existing.status === 'CANCELLED') {
      return withToken(json({ error: 'Cannot edit a cancelled session' }, 409), refreshedToken)
    }
    if (isTeacher) {
      const own = payload.campusName ? await resolveCoordinatorCampusName(payload) : undefined
      if (!own || existing.campusName !== own) {
        return withToken(json({ error: 'You can only edit entries for your own campus.' }, 403), refreshedToken)
      }
      if (!canTeacherEdit(existing.createdAt)) {
        return withToken(json({ error: EDIT_WINDOW_CLOSED_MESSAGE }, 403), refreshedToken)
      }
      if (update.sessionDate instanceof Date && update.sessionDate.getTime() > Date.now()) {
        return withToken(json({ error: 'The date cannot be in the future' }, 400), refreshedToken)
      }
      if (body.batchIds !== undefined) {
        const r = await resolveTeacherBatchEdit(body.batchIds, existing.batchId)
        if (!r.ok) return withToken(json({ error: r.error }, r.status), refreshedToken)
        update.batchId = r.batchId
        if (r.extras.length) update.extraBatchIds = r.extras
        else unset.extraBatchIds = ''
      }
    }

    // Live/Shoot (Studio): durationHours arrives as the time actually taken and is
    // stored multiplied for a Shoot; rawDurationHours keeps the real time.
    // Hours are only recomputed when the timing or the type actually changes, so editing
    // an unrelated field (e.g. the chapter) never alters hours saved under an older rule.
    if (existing.entryType || body.entryType !== undefined) {
      const type = (body.entryType ?? existing.entryType) as 'LIVE' | 'SHOOT'
      const timingSent = ['startTime', 'endTime', 'breakMinutes', 'lunchBreakMinutes', 'afternoonBreakMinutes', 'durationHours']
        .some((k) => body[k] !== undefined)
      if (timingSent || type !== existing.entryType) {
        const start = (body.startTime ?? existing.startTime) as string | undefined
        const end = (body.endTime ?? existing.endTime) as string | undefined
        if (usesFullBreak(type) && start && end) {
          // Live: the break is always deducted in full, whatever the client computed.
          const num = (k: string, fallback?: number) => Number(body[k] ?? fallback ?? 0)
          const h = fullBreakHours(start, end, [
            num('breakMinutes', existing.breakMinutes), num('lunchBreakMinutes', existing.lunchBreakMinutes),
            num('afternoonBreakMinutes', existing.afternoonBreakMinutes),
          ])
          if (h === null) {
            return withToken(json({ error: 'Break time must be shorter than the class time' }, 400), refreshedToken)
          }
          update.durationHours = h
          unset.rawDurationHours = ''
        } else {
          const raw = body.durationHours !== undefined
            ? Number(body.durationHours)
            : (existing.rawDurationHours ?? existing.durationHours)
          if (!(raw > 0)) {
            return withToken(json({ error: 'durationHours must be greater than 0' }, 400), refreshedToken)
          }
          update.durationHours = type === 'SHOOT' ? shootHours(raw) : raw
          if (type === 'SHOOT') update.rawDurationHours = raw
          else unset.rawDurationHours = ''
        }
        update.entryType = type
      }
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

/** DELETE /api/academics/sessions/:id — permanently remove an entry (HR/Admin only).
 *  The audit log keeps a snapshot of what was deleted. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await connectDB()
    const session = await Session.findByIdAndDelete(oid).populate('facultyId', 'name')
    if (!session) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)

    // The chapter was marked "class done" by this entry — reopen it.
    await BatchChapter.updateMany(
      { sessionId: oid, facultyClassDone: true },
      { $set: { facultyClassDone: false }, $unset: { facultyClassDoneAt: 1, sessionId: 1 } },
    ).catch(() => null)

    const facultyName = (session.facultyId as unknown as { name?: string })?.name
    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SESSION_DELETED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Session', targetId: id,
      targetName: session.chapter ? `${session.subject} — ${session.chapter}` : session.subject,
      description: `Session deleted: ${facultyName ?? 'faculty'} · ${session.subject}` +
        `${session.chapter ? ` "${session.chapter}"` : ''} on ${session.sessionDate.toDateString()}`,
      metadata: {
        campusName: session.campusName, batchId: session.batchId?.toString(), classMode: session.classMode,
        startTime: session.startTime, endTime: session.endTime, durationHours: session.durationHours,
        entryType: session.entryType, updatedByName: session.updatedByName, comment: session.comment,
      },
    }).catch(() => null)

    return withToken(json({ ok: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/academics/sessions/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
