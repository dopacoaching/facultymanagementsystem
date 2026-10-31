import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { Batch } from '@/lib/models/Batch'
import { Faculty } from '@/lib/models/Faculty'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { supersedeNoClass } from '@/lib/services/noClass'
import { unlistedChapters, unlistedChapterMessage } from '@/lib/services/chapterRules'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { getIgCampusNames } from '@/lib/utils/coordinatorCampus'
import { chapterSubjectOf } from '@/lib/constants/labSubjects'
import { normalizeChapters, joinChapters } from '@/lib/utils/chapters'
import { normalizeComment } from '@/lib/utils/teacherEdit'

/** Shown as "Entered by" on every joint entry — the login is held by one person. */
const JOINT_ENTERED_BY = 'Manuraj'

const CLASS_MODES = ['ONLINE', 'OFFLINE', 'ONLINE_DOUBT_CLEARANCE', 'OFFLINE_DOUBT_CLEARANCE'] as const
type ClassMode = typeof CLASS_MODES[number]

/** GET /api/ig/joint-sessions — what the joint entry form offers: every IG school with its
 *  active batches, and the active faculty. */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IG_JOINT_TEACHER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    await connectDB()
    const schools = await getIgCampusNames()
    const batches = await Batch.find({ type: 'IG', isActive: true, campusId: { $in: Array.from(schools.keys()).map((id) => new Types.ObjectId(id)) } })
      .select('name campusId').sort({ name: 1 }).lean()
    const faculty = await Faculty.find({ isActive: true }).select('name subject').sort({ name: 1 }).lean()

    return withToken(json({
      enteredBy: JOINT_ENTERED_BY,
      schools: Array.from(schools.entries())
        .map(([id, name]) => ({
          campusName: name,
          batches: batches.filter((b) => String(b.campusId) === id).map((b) => ({ _id: String(b._id), name: b.name })),
        }))
        .filter((s) => s.batches.length > 0)
        .sort((a, b) => a.campusName.localeCompare(b.campusName)),
      faculty: faculty.map((f) => ({ _id: String(f._id), name: f.name, subject: f.subject })),
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/ig/joint-sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/ig/joint-sessions — one class taught to batches of two or more IG schools at
 *  once. A single session (so the faculty's hours count once) that every school's report shows. */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IG_JOINT_TEACHER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const body = await req.json() as Record<string, unknown>
    const { facultyId, batchIds, subject, classMode, startTime, endTime, sessionDate } = body
    const breakMinutes = Number(body.breakMinutes ?? 0)
    const duration = Number(body.durationHours)
    const chapterList = normalizeChapters(body.chapters, body.chapter)
    const chapter = joinChapters(chapterList)

    if (typeof facultyId !== 'string' || typeof subject !== 'string' || !subject.trim() || !chapter
      || typeof sessionDate !== 'string' || typeof startTime !== 'string' || typeof endTime !== 'string') {
      return withToken(json({ error: 'Faculty, subject, chapter, date, start and end time are required' }, 400), refreshedToken)
    }
    if (typeof classMode !== 'string' || !(CLASS_MODES as readonly string[]).includes(classMode)) {
      return withToken(json({ error: `classMode must be one of: ${CLASS_MODES.join(', ')}` }, 400), refreshedToken)
    }
    if (!Number.isFinite(duration) || duration <= 0 || duration > 24) {
      return withToken(json({ error: 'durationHours must be greater than 0' }, 400), refreshedToken)
    }
    if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
      return withToken(json({ error: 'breakMinutes must be 0 or more' }, 400), refreshedToken)
    }
    if (!Array.isArray(batchIds) || batchIds.length < 2) {
      return withToken(json({ error: 'Select the batches of at least two IG schools' }, 400), refreshedToken)
    }

    const date = new Date(sessionDate)
    if (isNaN(date.getTime())) return withToken(json({ error: 'Invalid sessionDate' }, 400), refreshedToken)
    date.setHours(0, 0, 0, 0)
    if (date.getTime() > Date.now()) return withToken(json({ error: 'The date cannot be in the future' }, 400), refreshedToken)
    const dayStart = new Date(date)
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    let facultyOid: Types.ObjectId
    const batchOids: Types.ObjectId[] = []
    try {
      facultyOid = new Types.ObjectId(facultyId)
      for (const raw of batchIds) {
        const oid = new Types.ObjectId(String(raw))
        if (!batchOids.some((b) => b.equals(oid))) batchOids.push(oid)
      }
    } catch {
      return withToken(json({ error: 'Invalid faculty or batch' }, 400), refreshedToken)
    }

    await connectDB()

    const faculty = await Faculty.findById(facultyOid).select('isActive')
    if (!faculty || faculty.isActive === false) {
      return withToken(json({ error: 'Select an active faculty' }, 400), refreshedToken)
    }

    const bad = await unlistedChapters(subject, chapterList)
    if (bad.length) return withToken(json({ error: unlistedChapterMessage(subject, bad) }, 400), refreshedToken)

    const batches = await Batch.find({ _id: { $in: batchOids } }).select('campusId type isActive').lean()
    if (batches.length !== batchOids.length) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)
    if (batches.some((b) => b.type !== 'IG')) {
      return withToken(json({ error: 'Joint classes can only be logged against IG batches' }, 400), refreshedToken)
    }
    if (batches.some((b) => b.isActive === false)) {
      return withToken(json({ error: 'A selected batch is no longer active.' }, 400), refreshedToken)
    }
    const schoolNames = await getIgCampusNames()
    if (batches.some((b) => !schoolNames.has(String(b.campusId)))) {
      return withToken(json({ error: 'A selected batch does not belong to an active IG school.' }, 400), refreshedToken)
    }
    if (new Set(batches.map((b) => String(b.campusId))).size < 2) {
      return withToken(json({ error: 'Select batches from at least two IG schools — use the Push Board for a single school.' }, 400), refreshedToken)
    }

    const dup = await Session.findOne({
      facultyId: facultyOid,
      startTime,
      $or: [{ batchId: { $in: batchOids } }, { extraBatchIds: { $in: batchOids } }],
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
    })
    if (dup) {
      return withToken(json({
        error: 'Duplicate session: a session is already logged for this faculty in one of these batches at this start time on this date.',
        code: 'DUPLICATE_SESSION',
      }, 409), refreshedToken)
    }

    const session = await Session.create({
      facultyId: facultyOid,
      batchId: batchOids[0],
      extraBatchIds: batchOids.slice(1),
      jointIG: true,
      subject: subject.trim(),
      chapter,
      chapters: chapterList.length > 1 ? chapterList : undefined,
      classMode: classMode as ClassMode,
      startTime,
      endTime,
      breakMinutes,
      lunchBreakMinutes: 0,
      afternoonBreakMinutes: 0,
      updatedByName: JOINT_ENTERED_BY,
      comment: normalizeComment(body.comment) || undefined,
      durationHours: duration,
      sessionDate: date,
      status: 'COMPLETED',
      loggedByUserId: new Types.ObjectId(payload.userId),
    })

    // A real entry supersedes a "No Class" marker for each school it covers.
    for (const campusId of new Set(batches.map((b) => String(b.campusId)))) {
      const own = batches.filter((b) => String(b.campusId) === campusId).map((b) => b._id as Types.ObjectId)
      await supersedeNoClass(schoolNames.get(campusId) as string, dayStart, own, new Types.ObjectId(campusId)).catch(() => null)
    }

    // Mark the chapters taught for every batch that sat the class.
    for (const bOid of batchOids) {
      for (const chapterName of chapterList) {
        await BatchChapter.findOneAndUpdate(
          { batchId: bOid, subject: chapterSubjectOf(subject), chapterName },
          {
            $set: { facultyClassDone: true, facultyClassDoneAt: date, sessionId: session._id },
            $setOnInsert: { chapterOrder: 0, videoComplete: false },
          },
          { upsert: true },
        )
      }
    }

    writeAuditLog({
      category: 'IG', eventType: 'IG_SESSION_LOGGED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Session', targetId: session._id.toString(),
      targetName: `${subject} — ${chapter}`,
      description: `Joint IG session logged: ${subject} "${chapter}" on ${date.toDateString()} for ${Array.from(new Set(batches.map((b) => schoolNames.get(String(b.campusId))))).join(' + ')}`,
      metadata: { batchIds: batchOids.map(String), facultyId, subject, chapter, sessionDate: date, durationHours: duration },
    }).catch(() => null)

    return withToken(json(session, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/ig/joint-sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
