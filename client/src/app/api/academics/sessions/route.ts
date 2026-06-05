import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { Batch, IBatch } from '@/lib/models/Batch'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'
import { PermanentFacultyContract } from '@/lib/models/PermanentFacultyContract'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { isVideoFirstBatch } from '@/lib/utils/batchUtils'

function isCoordinator(role: string): boolean {
  return role === 'COORDINATOR' || role === 'IG_COORDINATOR'
}

/** GET /api/academics/sessions — exclude IS batches when no explicit batchId given */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    let facultyId        = searchParams.get('facultyId')   ?? undefined
    const batchId        = searchParams.get('batchId')     ?? undefined
    const batchType      = searchParams.get('batchType')   ?? undefined
    const month          = searchParams.get('month')       ?? undefined
    const year           = searchParams.get('year')        ?? undefined
    const limitParam     = searchParams.get('limit')       ?? undefined

    // Academics: exclude IS batches when no explicit batchId/batchType given
    const excludeBatchType = (!batchId && !batchType) ? 'IG' : undefined

    const filter: Record<string, unknown> = {}

    // FACULTY scope guard
    if (payload.role === 'FACULTY') {
      const theirFacultyId = payload.facultyId
      if (!theirFacultyId) {
        return withToken(json({ error: 'Faculty account not linked to a faculty profile' }, 403), refreshedToken)
      }
      facultyId = theirFacultyId
    }

    await connectDB()

    if (facultyId) {
      try { filter.facultyId = new Types.ObjectId(facultyId) } catch {
        return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
      }
    }

    if (batchId) {
      try { filter.batchId = new Types.ObjectId(batchId) } catch {
        return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
      }
    } else if (batchType) {
      const VALID_BATCH_TYPES = ['RESIDENTIAL', 'OFFLINE', 'ONLINE', 'IG']
      if (!VALID_BATCH_TYPES.includes(batchType)) {
        return withToken(json({ error: 'Invalid batchType' }, 400), refreshedToken)
      }
      const batchIds = await Batch.find({ type: batchType as never, isActive: true }).distinct('_id')
      filter.batchId = { $in: batchIds }
    } else if (excludeBatchType) {
      const excludedIds = await Batch.find({ type: excludeBatchType as never, isActive: true }).distinct('_id')
      filter.batchId = { $nin: excludedIds }
    }

    // ACADEMICS_MANAGER scope — applied LAST so it always wins over the IG-exclusion filter above
    if (payload.role === 'ACADEMICS_MANAGER' && payload.batchType) {
      const scopedIds = await Batch.find({ type: payload.batchType as never, isActive: true }).distinct('_id')
      if (batchId) {
        // Specific batch requested — verify it is within scope
        const inScope = scopedIds.some((id) => id.toString() === batchId)
        if (!inScope) {
          return withToken(json({ error: 'Access denied: batch is outside your assigned batch type' }, 403), refreshedToken)
        }
        // filter.batchId already set to this specific batch — leave it
      } else {
        // Replace whatever batchId filter was built above with the scope-restricted set
        filter.batchId = { $in: scopedIds }
      }
    }

    if (month && year) {
      filter.sessionDate = {
        $gte: new Date(Number(year), Number(month) - 1, 1),
        $lt:  new Date(Number(year), Number(month), 1),
      }
    }

    const maxLimit = 500
    const requestedLimit = limitParam ? Math.min(Number(limitParam), maxLimit) : maxLimit

    const sessions = await Session.find(filter)
      .populate('facultyId', 'name subject')
      .sort({ sessionDate: -1 })
      .limit(requestedLimit)

    return withToken(json(sessions), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/academics/sessions */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { facultyId, batchId, subject, chapter, syllabusChapterId, durationHours, sessionDate, timeSlot, startTime } = await req.json()

    if (!facultyId || !batchId || !subject || !chapter || !sessionDate) {
      return withToken(json({
        error: 'All fields are required: facultyId, batchId, subject, chapter, sessionDate',
      }, 400), refreshedToken)
    }
    const parsedDuration = Number(durationHours)
    if (!durationHours || isNaN(parsedDuration) || parsedDuration <= 0) {
      return withToken(json({ error: 'durationHours must be a positive number' }, 400), refreshedToken)
    }

    let facultyOid: Types.ObjectId, batchOid: Types.ObjectId
    try { facultyOid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }
    try { batchOid = new Types.ObjectId(batchId) } catch {
      return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
    }

    const date = new Date(sessionDate)
    if (isNaN(date.getTime())) {
      return withToken(json({ error: 'Invalid sessionDate' }, 400), refreshedToken)
    }
    date.setHours(0, 0, 0, 0)

    const dayStart = new Date(date)
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    await connectDB()

    const batch = await Batch.findById(batchOid)
    if (!batch) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)

    // ACADEMICS_MANAGER batch type scope guard
    if (payload.role === 'ACADEMICS_MANAGER' && payload.batchType && batch.type !== payload.batchType) {
      return withToken(json({ error: 'Access denied: batch is outside your assigned batch type' }, 403), refreshedToken)
    }

    // Coordinator batch ownership gate
    if (isCoordinator(payload.role)) {
      if (!payload.batchId || payload.batchId !== batchId) {
        return withToken(json({ error: 'You can only log sessions for your assigned batch.' }, 403), refreshedToken)
      }
    }

    // VIDEO-FIRST GATE (Residential + Online only)
    // Only blocks when the chapter record EXISTS with videoComplete=false.
    // If no record exists yet, the session log creates it — coordinator can then
    // mark videoComplete so future logs are gated correctly.
    if (isVideoFirstBatch(batch.type)) {
      const chapterRecord = await BatchChapter.findOne({
        batchId:     batchOid,
        subject:     subject.toUpperCase(),
        chapterName: chapter,
      })
      if (chapterRecord && !chapterRecord.videoComplete) {
        return withToken(json({
          error: `Cannot log faculty class for "${chapter}" — video lessons not yet marked complete for this batch.`,
          code:  'VIDEO_NOT_COMPLETE',
        }, 422), refreshedToken)
      }
    }

    // DUPLICATE SESSION CHECK
    const dup = await Session.findOne({
      facultyId: facultyOid,
      batchId:   batchOid,
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status:    { $ne: 'CANCELLED' },
    })
    if (dup) {
      return withToken(json({
        error: 'Duplicate session: a session is already logged for this faculty in this batch on this date.',
        code:  'DUPLICATE_SESSION',
      }, 409), refreshedToken)
    }

    // OFFLINE 1-CAMPUS LIMIT
    if (batch.type === 'OFFLINE') {
      const todaySessions = await Session.find({
        facultyId:   facultyOid,
        sessionDate: { $gte: dayStart, $lte: dayEnd },
        status:      { $ne: 'CANCELLED' },
      }).populate<{ batchId: IBatch }>('batchId', 'type campusId')

      const offlineOtherCampus = todaySessions.find((s) => {
        const b = s.batchId as unknown as IBatch
        return b.type === 'OFFLINE' && b.campusId.toString() !== batch.campusId.toString()
      })
      if (offlineOtherCampus) {
        return withToken(json({
          error: 'Offline faculty can only be assigned to one campus per day. Faculty is already assigned to a different offline campus today.',
          code:  'OFFLINE_CAMPUS_CONFLICT',
        }, 409), refreshedToken)
      }
    }

    // RESIDENTIAL/ONLINE MAX 2-CAMPUS CHECK
    if (isVideoFirstBatch(batch.type)) {
      const todaySessions = await Session.find({
        facultyId:   facultyOid,
        sessionDate: { $gte: dayStart, $lte: dayEnd },
        status:      { $ne: 'CANCELLED' },
      }).populate<{ batchId: IBatch }>('batchId', 'campusId')

      const campusesToday = new Set(
        todaySessions.map((s) => (s.batchId as unknown as IBatch).campusId.toString())
      )
      if (!campusesToday.has(batch.campusId.toString()) && campusesToday.size >= 2) {
        return withToken(json({
          error: 'Faculty already assigned to 2 campuses today. Maximum 2 campuses per day for residential/online faculty.',
          code:  'MAX_CAMPUS_LIMIT',
        }, 409), refreshedToken)
      }
    }

    // SPLIT-CHAPTER ORDERING GATE
    type PopulatedSyllabus = { _id: Types.ObjectId; chapterName: string; isSplitPart: boolean; splitPartNumber?: number; scheduledMonth: number; parentChapterId: { _id: Types.ObjectId; chapterName: string } | null }
    let resolvedSyllabus: PopulatedSyllabus | null = null
    let resolvedSyllabusOid: Types.ObjectId | undefined

    if (syllabusChapterId) {
      try { resolvedSyllabusOid = new Types.ObjectId(syllabusChapterId) } catch {
        return withToken(json({ error: 'Invalid syllabusChapterId' }, 400), refreshedToken)
      }
      resolvedSyllabus = (await SyllabusChapter.findById(resolvedSyllabusOid)
        .populate<{ parentChapterId: { _id: Types.ObjectId; chapterName: string } }>('parentChapterId', 'chapterName')
        .lean()) as PopulatedSyllabus | null
      if (!resolvedSyllabus) {
        return withToken(json({ error: 'syllabusChapterId not found' }, 400), refreshedToken)
      }
      if (resolvedSyllabus.isSplitPart && resolvedSyllabus.splitPartNumber === 2 && resolvedSyllabus.parentChapterId) {
        const part1Done = await BatchChapter.findOne({
          batchId:           batchOid,
          syllabusChapterId: resolvedSyllabus.parentChapterId._id,
          facultyClassDone:  true,
        })
        if (!part1Done) {
          return withToken(json({
            error: `Cannot log "${resolvedSyllabus.chapterName}" — "${resolvedSyllabus.parentChapterId.chapterName}" must be completed first for this batch.`,
            code:  'SPLIT_PART_ORDER_VIOLATION',
          }, 422), refreshedToken)
        }
      }
    }

    // All checks passed — create session
    const session = await Session.create({
      facultyId:     facultyOid,
      batchId:       batchOid,
      subject,
      chapter,
      startTime:     startTime  ?? undefined,
      durationHours: Number(durationHours),
      sessionDate:   date,
      timeSlot:      timeSlot   ?? undefined,
      status:        'SCHEDULED',
      loggedByUserId: new Types.ObjectId(payload.userId),
    })

    // Auto-mark chapter as facultyClassDone; attach syllabus link if provided
    const normSubject = subject.toUpperCase()
    const bcSet: Record<string, unknown> = {
      facultyClassDone:   true,
      facultyClassDoneAt: date,
      sessionId:          session._id,
    }
    if (resolvedSyllabusOid)  bcSet.syllabusChapterId = resolvedSyllabusOid
    if (resolvedSyllabus)     bcSet.scheduledMonth    = resolvedSyllabus.scheduledMonth

    await BatchChapter.findOneAndUpdate(
      { batchId: batchOid, subject: normSubject, chapterName: chapter },
      {
        $set: bcSet,
        $setOnInsert: { chapterOrder: 0, videoComplete: false },
      },
      { upsert: true }
    )

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SESSION_LOGGED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'Session', targetId: session._id.toString(),
      targetName: `${subject} — ${chapter}`,
      description: `Session logged: ${subject} "${chapter}" for batch on ${date.toDateString()}`,
      metadata: { batchId: batchId, facultyId, subject, chapter, sessionDate: date, durationHours: Number(durationHours) },
    }).catch(() => null)

    return withToken(json(session, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
