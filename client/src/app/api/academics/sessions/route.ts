import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { Batch, IBatch } from '@/lib/models/Batch'
import { Faculty } from '@/lib/models/Faculty'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'
import { ISTimetableSlot } from '@/lib/models/ISTimetableSlot'
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

    // scheduledTime (lateness tracking) is HR/Admin-only — strip it for every other role.
    const canSeeScheduledTime = payload.role === 'HR_MANAGER' || payload.role === 'ADMIN'
    const responseBody = canSeeScheduledTime
      ? sessions
      : sessions.map((s) => {
          const obj = s.toObject()
          delete obj.scheduledTime
          return obj
        })

    return withToken(json(responseBody), refreshedToken)
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

    const {
      facultyId, batchId, campusName, classMode, subject, chapter, syllabusChapterId,
      scheduledTime, updatedByName, durationHours, sessionDate, timeSlot, startTime, endTime, breakMinutes, sessionCategory,
    } = await req.json()

    if (!facultyId || !subject || !sessionDate) {
      return withToken(json({
        error: 'All fields are required: facultyId, subject, sessionDate',
      }, 400), refreshedToken)
    }
    if (!batchId && !campusName) {
      return withToken(json({ error: 'Either batchId or campusName is required' }, 400), refreshedToken)
    }
    const VALID_CLASS_MODES = ['ONLINE', 'OFFLINE', 'ONLINE_DOUBT_CLEARANCE', 'OFFLINE_DOUBT_CLEARANCE']
    if (campusName && !batchId && !VALID_CLASS_MODES.includes(classMode)) {
      return withToken(json({ error: `classMode must be one of: ${VALID_CLASS_MODES.join(', ')}` }, 400), refreshedToken)
    }
    // Campus-flow sessions are keyed by startTime for duplicate detection below —
    // require it here rather than relying on the coordinator UI's own validation.
    if (campusName && !batchId && !startTime) {
      return withToken(json({ error: 'startTime is required for campus-logged sessions' }, 400), refreshedToken)
    }
    const parsedDuration = Number(durationHours)
    if (!durationHours || isNaN(parsedDuration) || parsedDuration < 0.5) {
      return withToken(json({ error: 'durationHours must be at least 0.5 (30 minutes)' }, 400), refreshedToken)
    }

    let facultyOid: Types.ObjectId
    let batchOid: Types.ObjectId | undefined
    try { facultyOid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }
    if (batchId) {
      try { batchOid = new Types.ObjectId(batchId) } catch {
        return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
      }
    }

    const date = new Date(sessionDate)
    if (isNaN(date.getTime())) {
      return withToken(json({ error: 'Invalid sessionDate' }, 400), refreshedToken)
    }
    date.setHours(0, 0, 0, 0)

    const dayStart = new Date(date)
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    await connectDB()

    // batch is only relevant to the legacy Batch-linked flow — the campus-login
    // class-teacher flow (campusName, no batchId) skips all Batch-dependent checks.
    let batch: IBatch | null = null
    if (batchOid) {
      batch = await Batch.findById(batchOid)
      if (!batch) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)

      // ACADEMICS_MANAGER batch type scope guard
      if (payload.role === 'ACADEMICS_MANAGER' && payload.batchType && batch.type !== payload.batchType) {
        return withToken(json({ error: 'Access denied: batch is outside your assigned batch type' }, 403), refreshedToken)
      }
    }

    // Faculty on a category-split contract (e.g. doubt-clearance staff) must have
    // sessionCategory explicitly specified — silently defaulting to CLASS would
    // misclassify their hours and pay them at the wrong rate.
    const facultyDoc = await Faculty.findById(facultyOid).select('requiresSessionCategory')
    if (facultyDoc?.requiresSessionCategory && !sessionCategory) {
      return withToken(json({ error: 'sessionCategory (Class or Doubt Clearance) is required for this faculty' }, 400), refreshedToken)
    }

    // Coordinator ownership gate — locked to their own campus (new flow) or batch (legacy)
    if (isCoordinator(payload.role)) {
      if (campusName) {
        if (!payload.campusName || payload.campusName !== campusName) {
          return withToken(json({ error: 'You can only log sessions for your own campus.' }, 403), refreshedToken)
        }
      } else if (batchId) {
        if (!payload.batchId || payload.batchId !== batchId) {
          return withToken(json({ error: 'You can only log sessions for your assigned batch.' }, 403), refreshedToken)
        }
      }
    }

    // DUPLICATE SESSION CHECK — keyed by batch when present, else by campus.
    // A faculty routinely teaches more than one class at the same campus on
    // the same day (different batches/timings), so the campus flow also
    // matches on startTime — same faculty + campus + day + start time is an
    // accidental resubmission of the same class; a different start time is a
    // genuinely different session and must not be blocked.
    const dup = await Session.findOne({
      facultyId: facultyOid,
      ...(batchOid ? { batchId: batchOid } : { campusName, startTime }),
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status:    { $ne: 'CANCELLED' },
    })
    if (dup) {
      return withToken(json({
        error: batchOid
          ? 'Duplicate session: a session is already logged for this faculty on this date.'
          : 'Duplicate session: a session is already logged for this faculty at this start time on this date.',
        code:  'DUPLICATE_SESSION',
      }, 409), refreshedToken)
    }

    // OFFLINE 1-CAMPUS LIMIT (legacy Batch flow only)
    if (batch?.type === 'OFFLINE') {
      const todaySessions = await Session.find({
        facultyId:   facultyOid,
        sessionDate: { $gte: dayStart, $lte: dayEnd },
        status:      { $ne: 'CANCELLED' },
      }).populate<{ batchId: IBatch }>('batchId', 'type campusId')

      const offlineOtherCampus = todaySessions.find((s) => {
        const b = s.batchId as unknown as IBatch | undefined
        return b && b.type === 'OFFLINE' && b.campusId.toString() !== batch!.campusId.toString()
      })
      if (offlineOtherCampus) {
        return withToken(json({
          error: 'Offline faculty can only be assigned to one campus per day. Faculty is already assigned to a different offline campus today.',
          code:  'OFFLINE_CAMPUS_CONFLICT',
        }, 409), refreshedToken)
      }
    }

    // RESIDENTIAL/ONLINE MAX 2-CAMPUS CHECK (legacy Batch flow only)
    if (batch && isVideoFirstBatch(batch.type)) {
      const todaySessions = await Session.find({
        facultyId:   facultyOid,
        sessionDate: { $gte: dayStart, $lte: dayEnd },
        status:      { $ne: 'CANCELLED' },
      }).populate<{ batchId: IBatch }>('batchId', 'campusId')

      const campusesToday = new Set(
        todaySessions.filter((s) => s.batchId).map((s) => (s.batchId as unknown as IBatch).campusId.toString())
      )
      if (!campusesToday.has(batch.campusId.toString()) && campusesToday.size >= 2) {
        return withToken(json({
          error: 'Faculty already assigned to 2 campuses today. Maximum 2 campuses per day for residential/online faculty.',
          code:  'MAX_CAMPUS_LIMIT',
        }, 409), refreshedToken)
      }
    }

    // CROSS-SYSTEM LOCK — faculty cannot have a Repeaters session and an IG slot on the same day
    const igSlotToday = await ISTimetableSlot.findOne({
      facultyId:  facultyOid,
      date:       { $gte: dayStart, $lte: dayEnd },
      status:     { $ne: 'CANCELLED' },
    })
    if (igSlotToday) {
      return withToken(json({
        error: 'Faculty has an IG timetable slot on this date and cannot be scheduled in Repeaters on the same day.',
        code:  'CROSS_SYSTEM_CONFLICT',
      }, 409), refreshedToken)
    }

    // SPLIT-CHAPTER ORDERING GATE
    type PopulatedSyllabus = { _id: Types.ObjectId; chapterName: string; isSplitPart: boolean; splitPartNumber?: number; scheduledMonth: number; totalVideos: number; parentChapterId: { _id: Types.ObjectId; chapterName: string } | null }
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

    if (sessionCategory && !['CLASS', 'DOUBT_CLEARANCE'].includes(sessionCategory)) {
      return withToken(json({ error: 'sessionCategory must be CLASS or DOUBT_CLEARANCE' }, 400), refreshedToken)
    }

    // All checks passed — create session
    const session = await Session.create({
      facultyId:     facultyOid,
      batchId:       batchOid,
      campusName:    campusName || undefined,
      classMode:     classMode  || undefined,
      subject,
      chapter:       chapter || undefined,
      scheduledTime: scheduledTime || undefined,
      updatedByName: updatedByName || undefined,
      startTime:     startTime  ?? undefined,
      endTime:       endTime    ?? undefined,
      breakMinutes:  breakMinutes != null ? Number(breakMinutes) : undefined,
      durationHours: Number(durationHours),
      sessionDate:   date,
      timeSlot:      timeSlot   ?? undefined,
      // Campus-login class-teacher flow logs sessions retrospectively (real
      // start/end times, after the class happened) — COMPLETED immediately.
      // The legacy Batch flow schedules ahead of time and is marked complete
      // later via the status PATCH endpoint.
      status:        (!batchOid && campusName) ? 'COMPLETED' : 'SCHEDULED',
      loggedByUserId: new Types.ObjectId(payload.userId),
      sessionCategory: sessionCategory ?? 'CLASS',
    })

    // Auto-mark chapter as facultyClassDone; attach syllabus link if provided
    // (only meaningful when a chapter was given AND this is the legacy Batch flow —
    // the campus-login flow doesn't participate in the chapters/syllabus workflow)
    if (chapter && batchOid) {
      const normSubject = subject.toUpperCase()
      const bcSet: Record<string, unknown> = {
        facultyClassDone:   true,
        facultyClassDoneAt: date,
        sessionId:          session._id,
      }
      if (resolvedSyllabusOid)  bcSet.syllabusChapterId = resolvedSyllabusOid
      if (resolvedSyllabus)     bcSet.scheduledMonth    = resolvedSyllabus.scheduledMonth
      if (resolvedSyllabus)     bcSet.totalVideos       = resolvedSyllabus.totalVideos

      await BatchChapter.findOneAndUpdate(
        { batchId: batchOid, subject: normSubject, chapterName: chapter },
        {
          $set: bcSet,
          $setOnInsert: { chapterOrder: 0, videoComplete: false },
        },
        { upsert: true }
      )
    }

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SESSION_LOGGED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Session', targetId: session._id.toString(),
      targetName: chapter ? `${subject} — ${chapter}` : subject,
      description: chapter
        ? `Session logged: ${subject} "${chapter}" on ${date.toDateString()}`
        : `Session logged: ${subject} on ${date.toDateString()}`,
      metadata: { batchId, campusName, facultyId, subject, chapter, sessionDate: date, durationHours: Number(durationHours) },
    }).catch(() => null)

    return withToken(json(session, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
