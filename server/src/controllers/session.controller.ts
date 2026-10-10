import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { Session } from '../models/Session'
import { Faculty } from '../models/Faculty'
import { Batch, IBatch } from '../models/Batch'
import { BatchChapter } from '../models/BatchChapter'
import { SyllabusChapter, ISyllabusChapter } from '../models/SyllabusChapter'
import { PermanentFacultyContract } from '../models/PermanentFacultyContract'
import { writeAuditLog } from '../services/salary/audit'
import { asyncHandler } from '../utils/asyncHandler'
import { resolveExtraBatches } from '../utils/extraBatches'
import { isVideoFirstBatch } from '../utils/batchUtils'
import { validateObjectId } from '../utils/objectId'
import { dayRangeFilter } from '../utils/dateRange'
import { CAMPUS_LOGIN_CAMPUS_IDS } from '../utils/campusBatches'
import { Types } from 'mongoose'

/** Return true when the caller's role restricts them to their assigned batch only. */
function isCoordinator(role: string): boolean {
  return role === 'CLASS_TEACHER' || role === 'IG_CLASS_TEACHER'
}

export const getSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  let { facultyId, campusName, batchId, batchType, excludeBatchType, from, to } = req.query as Record<string, string | undefined>
  const filter: Record<string, unknown> = {}

  // FACULTY scope guard — faculty users may only view their own sessions
  if (req.user!.role === 'FACULTY') {
    const theirFacultyId = req.user!.facultyId
    if (!theirFacultyId) {
      res.status(403).json({ error: 'Faculty account not linked to a faculty profile' }); return
    }
    facultyId = theirFacultyId
  }

  // CLASS_TEACHER scope guard — campus-login coordinators may only view their own campus's sessions
  if (req.user!.role === 'CLASS_TEACHER' || req.user!.role === 'IG_CLASS_TEACHER') {
    if (!req.user!.campusName) {
      res.status(403).json({ error: 'Your account is not linked to a campus' }); return
    }
    campusName = req.user!.campusName
  }

  if (campusName) {
    filter.campusName = campusName
  }

  if (facultyId) { try { filter.facultyId = new Types.ObjectId(facultyId) } catch { res.status(400).json({ error: 'Invalid facultyId' }); return } }

  if (batchId) {
    try { filter.batchId = new Types.ObjectId(batchId) } catch { res.status(400).json({ error: 'Invalid batchId' }); return }
  } else if (batchType) {
    const batchIds = await Batch.find({ type: batchType, isActive: true }).distinct('_id')
    filter.batchId = { $in: batchIds }
  } else if (excludeBatchType) {
    const excludedIds = await Batch.find({ type: excludeBatchType, isActive: true }).distinct('_id')
    filter.batchId = { $nin: excludedIds }
  }

  if (from && to) {
    const range = dayRangeFilter(from, to)
    if (!range) { res.status(400).json({ error: 'from and to must be YYYY-MM-DD dates' }); return }
    filter.sessionDate = range
  }

  // Optional limit (default 500 hard cap to prevent unbounded responses).
  // Pass limit=N for lightweight views like the faculty dashboard.
  const maxLimit = 500
  const requestedLimit = req.query.limit ? Math.min(Number(req.query.limit), maxLimit) : maxLimit

  const sessions = await Session.find(filter)
    .populate('facultyId', 'name subject')
    .sort({ sessionDate: -1 })
    .limit(requestedLimit)

  // scheduledTime (lateness tracking) is HR/Admin-only — strip it for every other role.
  const canSeeScheduledTime = req.user!.role === 'HR_MANAGER' || req.user!.role === 'ADMIN'
  const responseBody = canSeeScheduledTime
    ? sessions
    : sessions.map((s) => {
        const obj = s.toObject()
        delete obj.scheduledTime
        delete obj.scheduledEndTime
        return obj
      })

  res.json(responseBody)
})

/**
 * POST /sessions — Log a new session.
 *
 * Validation gates (in order):
 *  1. Required fields: facultyId, batchId, subject, durationHours, sessionDate (chapter is optional)
 *  2. DUPLICATE check: same faculty + same batch + same calendar day
 *  3. OFFLINE 1-CAMPUS limit: faculty can only appear at one offline campus per day
 *  4. RESIDENTIAL/ONLINE 2-CAMPUS max: block third campus on the same day
 *  5. Auto-mark BatchChapter.facultyClassDone = true on success (only when a chapter was given)
 */
export const createSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    facultyId, batchId: rawBatchId, batchIds, campusName, classMode, subject, chapter, syllabusChapterId,
    scheduledTime, scheduledEndTime, updatedByName, startTime, endTime,
    breakMinutes, lunchBreakMinutes, afternoonBreakMinutes,
    durationHours, sessionDate, timeSlot, sessionCategory,
  } = req.body
  // Multi-batch classes send batchIds; the first is the primary batch.
  const batchId = rawBatchId ?? (Array.isArray(batchIds) ? batchIds[0] : undefined)

  // ── 1. Required fields ─────────────────────────────────────────────────────
  if (!facultyId || !subject || !durationHours || !sessionDate) {
    res.status(400).json({
      error: 'All fields are required: facultyId, subject, durationHours, sessionDate',
    })
    return
  }
  if (!batchId && !campusName) {
    res.status(400).json({ error: 'Either batchId or campusName is required' }); return
  }
  const VALID_CLASS_MODES = ['ONLINE', 'OFFLINE', 'ONLINE_DOUBT_CLEARANCE', 'OFFLINE_DOUBT_CLEARANCE']
  if (campusName && !VALID_CLASS_MODES.includes(classMode)) {
    res.status(400).json({ error: `classMode must be one of: ${VALID_CLASS_MODES.join(', ')}` }); return
  }
  // Campus-flow sessions are keyed by startTime for duplicate detection below —
  // require it here rather than relying on the coordinator UI's own validation.
  if (campusName && !startTime) {
    res.status(400).json({ error: 'startTime is required for campus-logged sessions' }); return
  }
  if (Number(durationHours) < 0.5) {
    res.status(400).json({ error: 'durationHours must be at least 0.5 (30 minutes)' }); return
  }

  let facultyOid: Types.ObjectId
  let batchOid: Types.ObjectId | undefined
  try { facultyOid = new Types.ObjectId(facultyId) } catch { res.status(400).json({ error: 'Invalid facultyId' }); return }
  if (batchId) {
    try { batchOid = new Types.ObjectId(batchId) } catch { res.status(400).json({ error: 'Invalid batchId' }); return }
  }

  const date = new Date(sessionDate)
  if (isNaN(date.getTime())) { res.status(400).json({ error: 'Invalid sessionDate' }); return }
  date.setHours(0, 0, 0, 0)

  const dayStart = new Date(date)
  const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)

  // batch is only relevant to the legacy Batch-linked flow — the campus-login
  // class-teacher flow (campusName, no batchId) skips all Batch-dependent checks.
  let batch: IBatch | null = null
  if (batchOid) {
    batch = await Batch.findById(batchOid)
    if (!batch) { res.status(404).json({ error: 'Batch not found' }); return }
  }

  let extraBatchOids: Types.ObjectId[] = []
  if (batch && Array.isArray(batchIds)) {
    const extra = await resolveExtraBatches(batchIds, batch)
    if (!extra.ok) { res.status(extra.status).json({ error: extra.error }); return }
    extraBatchOids = extra.extras
  }

  // Faculty on a category-split contract (e.g. doubt-clearance staff) must have
  // sessionCategory explicitly specified — silently defaulting to CLASS would
  // misclassify their hours and pay them at the wrong rate.
  const facultyDoc = await Faculty.findById(facultyOid).select('requiresSessionCategory')
  if (facultyDoc?.requiresSessionCategory && !sessionCategory) {
    res.status(400).json({ error: 'sessionCategory (Class or Doubt Clearance) is required for this faculty' }); return
  }

  // ── M-7: Coordinator ownership gate — own campus (Push Board) or batch (legacy).
  // An offline-centre login may pick one of its campus's batches; an IG class
  // teacher may pick any batch at their own IG school. ──
  if (isCoordinator(req.user!.role)) {
    if (campusName) {
      if (!req.user!.campusName || req.user!.campusName !== campusName) {
        res.status(403).json({ error: 'You can only log sessions for your own campus.' }); return
      }
      if (batch) {
        const allowedCampusId = CAMPUS_LOGIN_CAMPUS_IDS[req.user!.campusName]
        if (!allowedCampusId || batch.campusId.toString() !== allowedCampusId) {
          res.status(403).json({ error: 'That batch does not belong to your campus.' }); return
        }
      }
    } else if (batch && req.user!.campusId) {
      if (batch.campusId.toString() !== req.user!.campusId) {
        res.status(403).json({ error: 'You can only log sessions for your own campus.' }); return
      }
    } else if (batchId) {
      if (!req.user!.batchId || req.user!.batchId !== batchId) {
        res.status(403).json({ error: 'You can only log sessions for your assigned batch.' }); return
      }
    }
  }

  // ── 2b. SPLIT CHAPTER ORDERING GATE ──────────────────────────────────────
  // When a syllabusChapterId is provided, enforce Part 1 → Part 2 ordering.
  // Cache the fetched syllabusChapter doc so the upsert step (gate 6) can
  // reuse scheduledMonth without a second DB round-trip.
  type PopulatedSyllabus = ISyllabusChapter & {
    parentChapterId: { _id: Types.ObjectId; chapterName: string } | null
  }
  let resolvedSyllabusChapter: PopulatedSyllabus | null = null
  let resolvedSyllabusOid: Types.ObjectId | undefined

  if (syllabusChapterId) {
    try { resolvedSyllabusOid = new Types.ObjectId(syllabusChapterId) } catch {
      res.status(400).json({ error: 'Invalid syllabusChapterId' }); return
    }

    resolvedSyllabusChapter = (await SyllabusChapter.findById(resolvedSyllabusOid)
      .populate<{ parentChapterId: { _id: Types.ObjectId; chapterName: string } }>('parentChapterId', 'chapterName')
    ) as PopulatedSyllabus | null

    if (!resolvedSyllabusChapter) {
      res.status(400).json({ error: 'syllabusChapterId not found' }); return
    }

    if (resolvedSyllabusChapter.isSplitPart && resolvedSyllabusChapter.splitPartNumber === 2 && resolvedSyllabusChapter.parentChapterId) {
      const parent = resolvedSyllabusChapter.parentChapterId
      const part1Done = await BatchChapter.findOne({
        batchId:           batchOid,
        syllabusChapterId: parent._id,
        facultyClassDone:  true,
      })
      if (!part1Done) {
        res.status(422).json({
          error: `Cannot log "${resolvedSyllabusChapter.chapterName}" — "${parent.chapterName}" must be completed first for this batch.`,
          code:  'SPLIT_PART_ORDER_VIOLATION',
        }); return
      }
    }
  }

  // ── 3. DUPLICATE SESSION CHECK — keyed by campus when present (Push Board),
  // else by IG time slot / start time, else by batch (legacy).
  // A faculty routinely teaches more than one class at the same campus on the
  // same day (different batches/timings), so the campus flow also matches on
  // startTime — same faculty + campus + day + start time is an accidental
  // resubmission of the same class; a different start time is a genuinely
  // different session and must not be blocked. ──
  const dup = await Session.findOne({
    facultyId: facultyOid,
    ...(campusName
      ? { campusName, startTime }
      : timeSlot
        ? { batchId: batchOid, timeSlot }
        : req.user!.role === 'IG_CLASS_TEACHER'
          ? { batchId: batchOid, startTime }
          : { batchId: batchOid }),
    sessionDate: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: 'CANCELLED' },
  })
  if (dup) {
    res.status(409).json({
      error: campusName || startTime
        ? 'Duplicate session: a session is already logged for this faculty at this start time on this date.'
        : 'Duplicate session: a session is already logged for this faculty on this date.',
      code: 'DUPLICATE_SESSION',
    })
    return
  }

  // ── 4. OFFLINE 1-CAMPUS LIMIT (legacy Batch flow only) ────────────────────
  if (batch?.type === 'OFFLINE') {
    const todaySessions = await Session.find({
      facultyId: facultyOid,
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
    }).populate<{ batchId: IBatch }>('batchId', 'type campusId')

    const offlineOtherCampus = todaySessions.find((s) => {
      const b = s.batchId as unknown as IBatch | undefined
      return b && b.type === 'OFFLINE' && b.campusId.toString() !== batch!.campusId.toString()
    })
    if (offlineOtherCampus) {
      res.status(409).json({
        error: 'Offline faculty can only be assigned to one campus per day. Faculty is already assigned to a different offline campus today.',
        code: 'OFFLINE_CAMPUS_CONFLICT',
      })
      return
    }
  }

  // ── 5. RESIDENTIAL/ONLINE MAX 2-CAMPUS CHECK (legacy Batch flow only) ─────
  if (batch && isVideoFirstBatch(batch.type)) {
    const todaySessions = await Session.find({
      facultyId: facultyOid,
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
    }).populate<{ batchId: IBatch }>('batchId', 'campusId')

    const campusesToday = new Set(
      todaySessions.filter((s) => s.batchId).map((s) => (s.batchId as unknown as IBatch).campusId.toString())
    )
    if (!campusesToday.has(batch.campusId.toString()) && campusesToday.size >= 2) {
      res.status(409).json({
        error: 'Faculty already assigned to 2 campuses today. Maximum 2 campuses per day for residential/online faculty.',
        code: 'MAX_CAMPUS_LIMIT',
      })
      return
    }
  }

  if (sessionCategory && !['CLASS', 'DOUBT_CLEARANCE'].includes(sessionCategory)) {
    res.status(400).json({ error: 'sessionCategory must be CLASS or DOUBT_CLEARANCE' }); return
  }

  // ── All checks passed — create session ────────────────────────────────────
  const session = await Session.create({
    facultyId:     facultyOid,
    batchId:       batchOid,
    extraBatchIds: extraBatchOids.length ? extraBatchOids : undefined,
    campusName:    campusName || undefined,
    classMode:     classMode  || undefined,
    subject,
    chapter:       chapter || undefined,
    scheduledTime: scheduledTime || undefined,
    scheduledEndTime: scheduledEndTime || undefined,
    updatedByName: updatedByName || undefined,
    startTime:     startTime ?? undefined,
    endTime:       endTime   ?? undefined,
    breakMinutes:          breakMinutes != null ? Number(breakMinutes) : undefined,
    lunchBreakMinutes:     lunchBreakMinutes != null ? Number(lunchBreakMinutes) : undefined,
    afternoonBreakMinutes: afternoonBreakMinutes != null ? Number(afternoonBreakMinutes) : undefined,
    durationHours: Number(durationHours),
    sessionDate:   date,
    timeSlot:      timeSlot ?? undefined,
    // Push Board (class teachers + IG class teachers) logs sessions
    // retrospectively (real start/end times) — COMPLETED immediately. The
    // legacy Batch flow schedules ahead and is completed via the status PATCH.
    status:        (campusName || req.user!.role === 'IG_CLASS_TEACHER') ? 'COMPLETED' : 'SCHEDULED',
    loggedByUserId: new Types.ObjectId(req.user!.userId),
    sessionCategory: sessionCategory ?? 'CLASS',
  })

  // ── 5. AUTO-MARK chapter as facultyClassDone ─────────────────────────────
  // Only meaningful when a chapter was given AND this is the legacy Batch flow —
  // the campus-login flow doesn't participate in the chapters/syllabus workflow.
  // Upsert: if chapter record doesn't exist (not pre-seeded), create it.
  // Reuse the syllabusChapter doc already fetched in gate 2b — no second query.
  // Normalise subject to uppercase so it matches SyllabusChapter enum values.
  if (chapter && batchOid) {
    const normalisedSubject = subject.toUpperCase()

    const bcSet: Record<string, unknown> = {
      facultyClassDone:   true,
      facultyClassDoneAt: date,
      sessionId:          session._id,
    }
    if (resolvedSyllabusOid)          bcSet.syllabusChapterId = resolvedSyllabusOid
    if (resolvedSyllabusChapter)      bcSet.scheduledMonth    = resolvedSyllabusChapter.scheduledMonth
    if (resolvedSyllabusChapter)      bcSet.totalVideos       = resolvedSyllabusChapter.totalVideos

    for (const bOid of [batchOid, ...extraBatchOids]) {
      await BatchChapter.findOneAndUpdate(
        { batchId: bOid, subject: normalisedSubject, chapterName: chapter },
        {
          $set: bcSet,
          $setOnInsert: { chapterOrder: 0, videoComplete: false },
        },
        { upsert: true }
      )
    }
  }

  res.status(201).json(session)
})

export const updateSessionStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const oid = validateObjectId(req.params.id, 'sessionId', res)
  if (!oid) return
  const { status } = req.body
  const ALLOWED = ['SCHEDULED', 'COMPLETED', 'NOT_COMPLETED']
  if (!status || !ALLOWED.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${ALLOWED.join(', ')}` }); return
  }
  const session = await Session.findOneAndUpdate(
    { _id: oid, status: { $ne: 'CANCELLED' } },
    { status },
    { new: true },
  )
  if (!session) {
    const exists = await Session.exists({ _id: oid })
    res.status(exists ? 409 : 404).json({
      error: exists ? 'Cannot change the status of a cancelled session.' : 'Session not found',
    })
    return
  }
  res.json(session)
})

/**
 * PATCH /sessions/:id  (full edit — ADMIN / manager roles only)
 */
export const updateSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const oid = validateObjectId(req.params.id, 'sessionId', res)
  if (!oid) return

  const existing = await Session.findById(oid)
  if (!existing) { res.status(404).json({ error: 'Session not found' }); return }
  if (existing.status === 'CANCELLED') {
    res.status(409).json({ error: 'Cannot edit a cancelled session' }); return
  }

  const allowed = [
    'facultyId', 'batchId', 'campusName', 'classMode', 'subject', 'chapter',
    'scheduledTime', 'scheduledEndTime', 'updatedByName', 'startTime', 'endTime',
    'breakMinutes', 'lunchBreakMinutes', 'afternoonBreakMinutes',
    'durationHours', 'sessionDate', 'timeSlot',
  ]
  const update: Record<string, unknown> = {}

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === 'sessionDate') {
        const d = new Date(req.body[key])
        if (isNaN(d.getTime())) { res.status(400).json({ error: 'Invalid sessionDate' }); return }
        update[key] = d
      } else if (key === 'facultyId' || key === 'batchId') {
        try { update[key] = new Types.ObjectId(req.body[key]) } catch {
          res.status(400).json({ error: `Invalid ${key}` }); return
        }
      } else {
        update[key] = req.body[key]
      }
    }
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: 'No valid fields provided for update' }); return
  }

  const session = await Session.findByIdAndUpdate(oid, update, { new: true, runValidators: true })
    .populate('facultyId', 'name subject')
  if (!session) { res.status(404).json({ error: 'Session not found' }); return }
  res.json(session)
})

export const cancelSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sessionId, cancellationInitiator, cancellationReason } = req.body

  const VALID_INITIATORS = ['FACULTY', 'MANAGEMENT', 'STUDENT']
  if (!cancellationInitiator || !VALID_INITIATORS.includes(cancellationInitiator)) {
    res.status(400).json({ error: 'cancellationInitiator must be FACULTY, MANAGEMENT, or STUDENT' })
    return
  }
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId required' })
    return
  }

  // M-7: Coordinators may only cancel sessions for their own campus (or assigned batch, legacy).
  if (isCoordinator(req.user!.role)) {
    const targetSession = await Session.findById(sessionId).lean()
    if (!targetSession) { res.status(404).json({ error: 'Session not found' }); return }
    if (targetSession.campusName) {
      if (!req.user!.campusName || targetSession.campusName !== req.user!.campusName) {
        res.status(403).json({ error: 'You can only cancel sessions for your own campus.' }); return
      }
    } else if (!req.user!.batchId || !targetSession.batchId || targetSession.batchId.toString() !== req.user!.batchId) {
      res.status(403).json({ error: 'You can only cancel sessions for your assigned batch.' }); return
    }
  }

  const storedInitiator = cancellationInitiator as 'FACULTY' | 'MANAGEMENT' | 'STUDENT'

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, status: { $ne: 'CANCELLED' } },
    {
      status: 'CANCELLED',
      cancellationInitiator: storedInitiator,
      cancellationReason: cancellationReason || `Cancelled by ${cancellationInitiator.toLowerCase()}`,
    },
    { new: true }
  ).populate('facultyId', 'name')

  if (!session) {
    const exists = await Session.exists({ _id: sessionId })
    res.status(exists ? 409 : 404).json({ error: exists ? 'Session is already cancelled.' : 'Session not found' })
    return
  }

  const populatedFaculty = session.facultyId as unknown as { _id: Types.ObjectId; name: string }
  const facultyOid = (populatedFaculty?._id ?? session.facultyId) as Types.ObjectId
  const facultyName = populatedFaculty?.name ?? 'Unknown'

  // Reset the chapter's class-done status so it can be re-logged correctly.
  // Match by batchId+subject+chapterName (not sessionId, which may not be set if the chapter
  // was marked done via the chapter endpoint rather than via a session status update).
  await BatchChapter.findOneAndUpdate(
    { batchId: session.batchId, subject: session.subject, chapterName: session.chapter, facultyClassDone: true },
    { $set: { facultyClassDone: false }, $unset: { facultyClassDoneAt: 1, sessionId: 1 } }
  ).catch(() => null)

  if (storedInitiator === 'FACULTY') {
    const contract = await PermanentFacultyContract.findOne({ facultyId: facultyOid })
    const penaltyAmount = contract?.cancellationPenaltyPerClass ?? 0

    await writeAuditLog({
      category: 'HR', eventType: 'PENALTY_APPLIED',
      actorUserId: req.user!.userId, actorRole: req.user!.role, actorUsername: req.user!.username,
      targetType: 'Faculty', targetId: facultyOid.toString(), targetName: facultyName,
      facultyId: facultyOid.toString(), facultyName, amount: penaltyAmount,
      description: `Class cancelled by faculty on ${session.sessionDate.toDateString()}` +
        (penaltyAmount > 0 ? ` — penalty ₹${penaltyAmount.toLocaleString('en-IN')}` : ' — no penalty contract'),
      cancellationInitiator: 'FACULTY',
      sessionId: session._id.toString(),
    })
  } else {
    const initiatorLabel = cancellationInitiator === 'STUDENT' ? 'student' : 'management'
    await writeAuditLog({
      category: 'ACADEMICS', eventType: 'SESSION_CANCELLED',
      actorUserId: req.user!.userId, actorRole: req.user!.role, actorUsername: req.user!.username,
      targetType: 'Session', targetId: session._id.toString(), targetName: facultyName,
      facultyId: facultyOid.toString(), facultyName,
      description: `Session on ${session.sessionDate.toDateString()} cancelled by ${initiatorLabel}` +
        (cancellationReason ? ` — ${cancellationReason}` : ''),
      cancellationInitiator: storedInitiator,
      sessionId: session._id.toString(),
    })
  }

  res.json({ success: true, session })
})
