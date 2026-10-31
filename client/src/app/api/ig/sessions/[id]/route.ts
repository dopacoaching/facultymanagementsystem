import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { Faculty } from '@/lib/models/Faculty'
import { Batch } from '@/lib/models/Batch'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { isEntryType } from '@/lib/constants/entryTypes'
import { chapterNamesOf, normalizeChapters, joinChapters } from '@/lib/utils/chapters'
import { unlistedChapters, unlistedInChapterText, unlistedChapterMessage } from '@/lib/services/chapterRules'
import { resolveHrBatchSet, resolveTeacherBatchEdit, syncChapterLinks } from '@/lib/utils/extraBatches'
import { canTeacherEdit, EDIT_WINDOW_CLOSED_MESSAGE, normalizeComment, TEACHER_EDITABLE_FIELDS } from '@/lib/utils/teacherEdit'

/** PATCH /api/ig/sessions/:id — full edit (HR/Admin). An IG class teacher may correct an
 *  entry for their own school for 24 hours after it was pushed. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN', 'IG_CLASS_TEACHER', 'IG_JOINT_TEACHER')
    // The joint-entry login edits joint classes only, under the same field list and 24-hour window.
    const isJointTeacher = payload.role === 'IG_JOINT_TEACHER'
    const isTeacher = payload.role === 'IG_CLASS_TEACHER' || isJointTeacher
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid sessionId' }, 400), refreshedToken)
    }

    const body = await req.json() as Record<string, unknown>
    const allowed: readonly string[] = isTeacher ? TEACHER_EDITABLE_FIELDS : [
      'facultyId', 'batchId', 'subject', 'chapter', 'timeSlot',
      'scheduledTime', 'scheduledEndTime', 'startTime', 'endTime', 'updatedByName', 'comment',
      'breakMinutes', 'lunchBreakMinutes', 'afternoonBreakMinutes',
      'durationHours', 'sessionDate',
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

    if (body.batchIds !== undefined && (!Array.isArray(body.batchIds) || body.batchIds.length === 0)) {
      return withToken(json({ error: 'Select at least one batch' }, 400), refreshedToken)
    }
    if (Object.keys(update).length === 0 && body.batchIds === undefined && !Array.isArray(body.chapters)) {
      return withToken(json({ error: 'No valid fields provided for update' }, 400), refreshedToken)
    }

    await connectDB()

    const existing = await Session.findById(oid)
    if (!existing) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)
    if (existing.status === 'CANCELLED') {
      return withToken(json({ error: 'Cannot edit a cancelled session' }, 409), refreshedToken)
    }
    if (isJointTeacher) {
      if (!existing.jointIG) return withToken(json({ error: 'You can only edit joint classes.' }, 403), refreshedToken)
      if (body.batchIds !== undefined) {
        return withToken(json({ error: 'The schools and batches of a joint class cannot be changed — contact HR.' }, 403), refreshedToken)
      }
    } else if (isTeacher && existing.jointIG) {
      return withToken(json({ error: 'This is a joint class for several schools — contact HR to change it.' }, 403), refreshedToken)
    }
    if (isTeacher) {
      if (!isJointTeacher) {
        const batch = existing.batchId ? await Batch.findById(existing.batchId).select('campusId type') : null
        if (!payload.campusId || !batch || batch.type !== 'IG' || batch.campusId.toString() !== payload.campusId) {
          return withToken(json({ error: 'You can only edit entries for your own school.' }, 403), refreshedToken)
        }
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
    if (update.facultyId) {
      const fac = await Faculty.findById(update.facultyId).select('isActive')
      if (!fac) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)
      if (isTeacher && fac.isActive === false && String(existing.facultyId) !== String(update.facultyId)) {
        return withToken(json({ error: 'That faculty is no longer active.' }, 400), refreshedToken)
      }
    }
    // Which batches sat the class. A teacher stays inside their school; HR/Admin may move it to any IG school.
    if (body.batchIds !== undefined) {
      const r = isTeacher
        ? await resolveTeacherBatchEdit(body.batchIds, existing.batchId, { igOnly: true })
        : await resolveHrBatchSet(body.batchIds, { igOnly: true, anyCampus: !!existing.jointIG })
      if (!r.ok) return withToken(json({ error: r.error }, r.status), refreshedToken)
      update.batchId = r.batchId
      if (r.extras.length) update.extraBatchIds = r.extras
      else unset.extraBatchIds = ''
    }

    // A class covers one subject and one or more chapters; teachers may only log listed chapters.
    if (Array.isArray(body.chapters)) {
      const list = normalizeChapters(body.chapters)
      if (isTeacher) {
        const subj = String(update.subject ?? existing.subject)
        const bad = await unlistedChapters(subj, list.filter((n) => !chapterNamesOf(existing).includes(n)))
        if (bad.length) return withToken(json({ error: unlistedChapterMessage(subj, bad) }, 400), refreshedToken)
      }
      update.chapter = joinChapters(list)
      if (list.length > 1) update.chapters = list
      else unset.chapters = ''
    } else if (isTeacher && typeof update.chapter === 'string' && update.chapter !== existing.chapter) {
      const subj = String(update.subject ?? existing.subject)
      const bad = await unlistedInChapterText(subj, update.chapter)
      if (bad.length) return withToken(json({ error: unlistedChapterMessage(subj, bad) }, 400), refreshedToken)
    }
    // Edited chapter text no longer matches the stored list of names.
    if (!Array.isArray(body.chapters) && update.chapter !== undefined && update.chapter !== existing.chapter) unset.chapters = ''
    const session = await Session.findByIdAndUpdate(
      oid,
      { ...(Object.keys(update).length ? { $set: update } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true },
    )
      .populate('facultyId', 'name subject')
    if (!session) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)
    if (update.batchId || update.chapter !== undefined || update.subject !== undefined) {
      await syncChapterLinks(session, { perBatch: true }).catch(() => null)
    }

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

/** DELETE /api/ig/sessions/:id — permanently remove an entry (HR/Admin only).
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
      category: 'IG', eventType: 'SESSION_DELETED',
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
    console.error('[DELETE /api/ig/sessions/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
