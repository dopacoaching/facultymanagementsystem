import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { Batch } from '@/lib/models/Batch'
import { Faculty } from '@/lib/models/Faculty'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { supersedeNoClass } from '@/lib/services/noClass'
import { listActivePushCampuses } from '@/lib/services/pushCampuses'
import { unlistedChapters, unlistedChapterMessage } from '@/lib/services/chapterRules'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { chapterSubjectOf } from '@/lib/constants/labSubjects'
import { JOINT_REPEATER_CAMPUSES, JOINT_REPEATER_ENTERED_BY } from '@/lib/constants/jointCampuses'
import { normalizeChapters, joinChapters } from '@/lib/utils/chapters'
import { normalizeComment } from '@/lib/utils/teacherEdit'

const CLASS_MODES = ['ONLINE', 'OFFLINE', 'ONLINE_DOUBT_CLEARANCE', 'OFFLINE_DOUBT_CLEARANCE'] as const
type ClassMode = typeof CLASS_MODES[number]

/** The campuses the joint form offers: active, on the allowed list, with their active batches. */
async function jointCampusOptions() {
  const allowed = new Set<string>(JOINT_REPEATER_CAMPUSES)
  const campuses = (await listActivePushCampuses()).filter((c) => c.kind === 'CAMPUS' && allowed.has(c.name))
  const batchCampusIds = campuses.filter((c) => c.batchCampusId).map((c) => c.batchCampusId as Types.ObjectId)
  const batches = batchCampusIds.length
    ? await Batch.find({ campusId: { $in: batchCampusIds }, isActive: true }).select('name campusId').sort({ name: 1 }).lean()
    : []
  return campuses.map((c) => ({
    name: c.name,
    batchCampusId: c.batchCampusId ? String(c.batchCampusId) : null,
    batches: batches.filter((b) => c.batchCampusId && String(b.campusId) === String(c.batchCampusId)).map((b) => ({ _id: String(b._id), name: b.name })),
  }))
}

/** GET /api/academics/joint-sessions — what the repeaters joint form offers. */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'REPEATERS_JOINT_TEACHER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    await connectDB()
    const campuses = await jointCampusOptions()
    const faculty = await Faculty.find({ isActive: true }).select('name subject').sort({ name: 1 }).lean()
    return withToken(json({
      enteredBy: JOINT_REPEATER_ENTERED_BY,
      campuses: campuses.map((c) => ({ name: c.name, batches: c.batches })),
      faculty: faculty.map((f) => ({ _id: String(f._id), name: f.name, subject: f.subject })),
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/joint-sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/academics/joint-sessions — one class taught to two or more campuses at once.
 *  A single session (the faculty's hours count once) that every campus's report shows.
 *  Campuses that run batches must say which of their batches sat the class. */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'REPEATERS_JOINT_TEACHER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const body = await req.json() as Record<string, unknown>
    const { facultyId, subject, classMode, startTime, endTime, sessionDate } = body
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
    if (!Array.isArray(body.campusNames) || !body.campusNames.every((n) => typeof n === 'string')) {
      return withToken(json({ error: 'Select the campuses that shared the class' }, 400), refreshedToken)
    }
    const campusNames = Array.from(new Set(body.campusNames as string[]))
    if (campusNames.length < 2) {
      return withToken(json({ error: 'Select at least two campuses — use the Push Board for a single campus' }, 400), refreshedToken)
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
      for (const raw of Array.isArray(body.batchIds) ? body.batchIds : []) {
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

    // Every campus must be on the allowed list; each batch must belong to one of them.
    const options = await jointCampusOptions()
    const picked = campusNames.map((n) => options.find((o) => o.name === n))
    if (picked.some((p) => !p)) {
      return withToken(json({ error: 'A selected campus is not available for joint classes.' }, 400), refreshedToken)
    }
    const chosen = picked as NonNullable<typeof picked[number]>[]
    const ownerOf = new Map<string, string>()   // batchId -> campus name
    for (const c of chosen) for (const b of c.batches) ownerOf.set(b._id, c.name)
    if (batchOids.some((b) => !ownerOf.has(String(b)))) {
      return withToken(json({ error: 'A selected batch does not belong to the selected campuses (or is no longer active).' }, 400), refreshedToken)
    }
    for (const c of chosen) {
      if (c.batches.length > 0 && !batchOids.some((b) => ownerOf.get(String(b)) === c.name)) {
        return withToken(json({ error: `Select the batch(es) of ${c.name} that attended.` }, 400), refreshedToken)
      }
    }

    const dup = await Session.findOne({
      facultyId: facultyOid,
      startTime,
      $or: [{ campusName: { $in: campusNames } }, { jointCampuses: { $in: campusNames } }],
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
    })
    if (dup) {
      return withToken(json({
        error: 'Duplicate session: a session is already logged for this faculty at one of these campuses at this start time on this date.',
        code: 'DUPLICATE_SESSION',
      }, 409), refreshedToken)
    }

    const session = await Session.create({
      facultyId: facultyOid,
      campusName: campusNames[0],
      jointCampuses: campusNames,
      batchId: batchOids[0],
      extraBatchIds: batchOids.length > 1 ? batchOids.slice(1) : undefined,
      subject: subject.trim(),
      chapter,
      chapters: chapterList.length > 1 ? chapterList : undefined,
      classMode: classMode as ClassMode,
      startTime,
      endTime,
      breakMinutes,
      lunchBreakMinutes: 0,
      afternoonBreakMinutes: 0,
      updatedByName: JOINT_REPEATER_ENTERED_BY,
      comment: normalizeComment(body.comment) || undefined,
      durationHours: duration,
      sessionDate: date,
      status: 'COMPLETED',
      loggedByUserId: new Types.ObjectId(payload.userId),
      sessionCategory: 'CLASS',
    })

    // A real entry supersedes a "No Class" marker for the batches (or campus) it covers.
    for (const c of chosen) {
      const own = batchOids.filter((b) => ownerOf.get(String(b)) === c.name)
      await supersedeNoClass(c.name, dayStart, own, c.batchCampusId ? new Types.ObjectId(c.batchCampusId) : null).catch(() => null)
    }

    // Campus entries mark the chapters taught on the primary batch only.
    if (batchOids[0]) {
      for (const chapterName of chapterList) {
        await BatchChapter.findOneAndUpdate(
          { batchId: batchOids[0], subject: chapterSubjectOf(subject), chapterName },
          {
            $set: { facultyClassDone: true, facultyClassDoneAt: date, sessionId: session._id },
            $setOnInsert: { chapterOrder: 0, videoComplete: false },
          },
          { upsert: true },
        )
      }
    }

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SESSION_LOGGED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Session', targetId: session._id.toString(),
      targetName: `${subject} — ${chapter}`,
      description: `Joint session logged: ${subject} "${chapter}" on ${date.toDateString()} for ${campusNames.join(' + ')}`,
      metadata: { campusNames, batchIds: batchOids.map(String), facultyId, subject, chapter, sessionDate: date, durationHours: duration },
    }).catch(() => null)

    return withToken(json(session, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/joint-sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
