import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { Session } from '../models/Session'
import { Faculty } from '../models/Faculty'
import { Batch, IBatch } from '../models/Batch'
import { ISTimetableSlot } from '../models/ISTimetableSlot'
import { BatchChapter } from '../models/BatchChapter'
import { SyllabusChapter, ISyllabusChapter } from '../models/SyllabusChapter'
import { PermanentFacultyContract } from '../models/PermanentFacultyContract'
import { writeAuditLog } from '../services/salary/audit'
import { asyncHandler } from '../utils/asyncHandler'
import { isVideoFirstBatch } from '../utils/batchUtils'
import { validateObjectId } from '../utils/objectId'
import { Types } from 'mongoose'

/** Return true when the caller's role restricts them to their assigned batch only. */
function isCoordinator(role: string): boolean {
  return role === 'COORDINATOR' || role === 'IG_COORDINATOR'
}

export const getSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  let { facultyId, batchId, batchType, excludeBatchType, month, year } = req.query as Record<string, string | undefined>
  const filter: Record<string, unknown> = {}

  // FACULTY scope guard — faculty users may only view their own sessions
  if (req.user!.role === 'FACULTY') {
    const theirFacultyId = req.user!.facultyId
    if (!theirFacultyId) {
      res.status(403).json({ error: 'Faculty account not linked to a faculty profile' }); return
    }
    facultyId = theirFacultyId
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

  if (month && year) {
    filter.sessionDate = {
      $gte: new Date(Number(year), Number(month) - 1, 1),
      $lt: new Date(Number(year), Number(month), 1),
    }
  }

  // Optional limit (default 500 hard cap to prevent unbounded responses).
  // Pass limit=N for lightweight views like the faculty dashboard.
  const maxLimit = 500
  const requestedLimit = req.query.limit ? Math.min(Number(req.query.limit), maxLimit) : maxLimit

  const sessions = await Session.find(filter)
    .populate('facultyId', 'name subject')
    .sort({ sessionDate: -1 })
    .limit(requestedLimit)

  res.json(sessions)
})

/**
 * POST /sessions — Log a new session.
 *
 * Validation gates (in order):
 *  1. Required fields: facultyId, batchId, subject, chapter, durationHours, sessionDate
 *  2. VIDEO-FIRST gate (Residential + Online only):
 *       block if BatchChapter.videoComplete = false for this chapter
 *  3. DUPLICATE check: same faculty + same batch + same calendar day
 *  4. OFFLINE 1-CAMPUS limit: faculty can only appear at one offline campus per day
 *  5. RESIDENTIAL/ONLINE 2-CAMPUS max: block third campus on the same day
 *  6. Auto-mark BatchChapter.facultyClassDone = true on success
 */
export const createSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId, batchId, subject, chapter, syllabusChapterId, startTime, durationHours, sessionDate, timeSlot } = req.body

  // ── 1. Required fields ─────────────────────────────────────────────────────
  if (!facultyId || !batchId || !subject || !chapter || !durationHours || !sessionDate) {
    res.status(400).json({
      error: 'All fields are required: facultyId, batchId, subject, chapter, durationHours, sessionDate',
    })
    return
  }
  if (Number(durationHours) <= 0) {
    res.status(400).json({ error: 'durationHours must be a positive number' }); return
  }

  let facultyOid: Types.ObjectId, batchOid: Types.ObjectId
  try { facultyOid = new Types.ObjectId(facultyId) } catch { res.status(400).json({ error: 'Invalid facultyId' }); return }
  try { batchOid = new Types.ObjectId(batchId) } catch { res.status(400).json({ error: 'Invalid batchId' }); return }

  const date = new Date(sessionDate)
  if (isNaN(date.getTime())) { res.status(400).json({ error: 'Invalid sessionDate' }); return }
  date.setHours(0, 0, 0, 0)

  const dayStart = new Date(date)
  const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)

  // Fetch batch so we know its type and campusId
  const batch = await Batch.findById(batchOid)
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return }

  // ── M-7: Coordinator batch ownership gate (before any DB queries) ────────
  if (isCoordinator(req.user!.role)) {
    if (!req.user!.batchId || req.user!.batchId !== batchId) {
      res.status(403).json({ error: 'You can only log sessions for your assigned batch.' }); return
    }
  }

  // ── 2. VIDEO-FIRST GATE (Residential + Online only) ──────────────────────
  if (isVideoFirstBatch(batch.type)) {
    // Normalise subject to uppercase so the lookup always matches seeded data
    // (gate 6 normalises the same way when upserting the BatchChapter record).
    const chapterRecord = await BatchChapter.findOne({
      batchId: batchOid,
      subject: subject.toUpperCase(),
      chapterName: chapter,
    })
    if (!chapterRecord || !chapterRecord.videoComplete) {
      res.status(422).json({
        error: `Cannot log faculty class for "${chapter}" — video lessons not yet marked complete for this batch.`,
        code: 'VIDEO_NOT_COMPLETE',
      })
      return
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

  // ── 3. DUPLICATE SESSION CHECK ────────────────────────────────────────────
  const dup = await Session.findOne({
    facultyId: facultyOid,
    batchId: batchOid,
    sessionDate: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: 'CANCELLED' },
  })
  if (dup) {
    res.status(409).json({
      error: 'Duplicate session: a session is already logged for this faculty in this batch on this date.',
      code: 'DUPLICATE_SESSION',
    })
    return
  }

  // ── 4. OFFLINE 1-CAMPUS LIMIT ─────────────────────────────────────────────
  if (batch.type === 'OFFLINE') {
    const todaySessions = await Session.find({
      facultyId: facultyOid,
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
    }).populate<{ batchId: IBatch }>('batchId', 'type campusId')

    const offlineOtherCampus = todaySessions.find((s) => {
      const b = s.batchId as unknown as IBatch
      return b.type === 'OFFLINE' && b.campusId.toString() !== batch.campusId.toString()
    })
    if (offlineOtherCampus) {
      res.status(409).json({
        error: 'Offline faculty can only be assigned to one campus per day. Faculty is already assigned to a different offline campus today.',
        code: 'OFFLINE_CAMPUS_CONFLICT',
      })
      return
    }
  }

  // ── 5. RESIDENTIAL/ONLINE MAX 2-CAMPUS CHECK ─────────────────────────────
  if (isVideoFirstBatch(batch.type)) {
    const todaySessions = await Session.find({
      facultyId: facultyOid,
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
    }).populate<{ batchId: IBatch }>('batchId', 'campusId')

    const campusesToday = new Set(
      todaySessions.map((s) => (s.batchId as unknown as IBatch).campusId.toString())
    )
    if (!campusesToday.has(batch.campusId.toString()) && campusesToday.size >= 2) {
      res.status(409).json({
        error: 'Faculty already assigned to 2 campuses today. Maximum 2 campuses per day for residential/online faculty.',
        code: 'MAX_CAMPUS_LIMIT',
      })
      return
    }
  }

  // ── 5b. CROSS-SYSTEM LOCK: IG slot blocks Repeaters scheduling ───────────
  // If the faculty has any non-cancelled IG timetable slot on this date, block.
  const igConflict = await ISTimetableSlot.findOne({
    facultyId: facultyOid,
    date:      { $gte: dayStart, $lte: dayEnd },
    status:    { $ne: 'CANCELLED' },
  })
  if (igConflict) {
    res.status(409).json({
      error: 'Faculty has an Integrated School (IG) class on this date and cannot be scheduled for Repeaters on the same day.',
      code:  'IG_SESSION_CONFLICT',
    })
    return
  }

  // ── All checks passed — create session ────────────────────────────────────
  const session = await Session.create({
    facultyId:     facultyOid,
    batchId:       batchOid,
    subject,
    chapter,
    startTime:     startTime ?? undefined,
    durationHours: Number(durationHours),
    sessionDate:   date,
    timeSlot:      timeSlot ?? undefined,
    status:        'SCHEDULED',
    loggedByUserId: new Types.ObjectId(req.user!.userId),
  })

  // ── 6. AUTO-MARK chapter as facultyClassDone ─────────────────────────────
  // Upsert: if chapter record doesn't exist (not pre-seeded), create it.
  // Reuse the syllabusChapter doc already fetched in gate 2b — no second query.
  // Normalise subject to uppercase so it matches SyllabusChapter enum values.
  const normalisedSubject = subject.toUpperCase()

  const bcSet: Record<string, unknown> = {
    facultyClassDone:   true,
    facultyClassDoneAt: date,
    sessionId:          session._id,
  }
  if (resolvedSyllabusOid)          bcSet.syllabusChapterId = resolvedSyllabusOid
  if (resolvedSyllabusChapter)      bcSet.scheduledMonth    = resolvedSyllabusChapter.scheduledMonth

  await BatchChapter.findOneAndUpdate(
    { batchId: batchOid, subject: normalisedSubject, chapterName: chapter },
    {
      $set: bcSet,
      $setOnInsert: { chapterOrder: 0, videoComplete: false },
    },
    { upsert: true }
  )

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

  const allowed = ['facultyId', 'batchId', 'subject', 'chapter', 'startTime', 'durationHours', 'sessionDate', 'timeSlot']
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

  // ── Cross-system lock: re-check if facultyId or sessionDate is changing ──
  if ('facultyId' in update || 'sessionDate' in update) {
    const effectiveFacultyId = (update.facultyId ?? existing.facultyId) as Types.ObjectId
    const effectiveDate = new Date((update.sessionDate as Date | undefined) ?? existing.sessionDate)
    effectiveDate.setHours(0, 0, 0, 0)
    const dayStart = new Date(effectiveDate)
    const dayEnd   = new Date(effectiveDate); dayEnd.setHours(23, 59, 59, 999)

    const igConflict = await ISTimetableSlot.findOne({
      facultyId: effectiveFacultyId,
      date:      { $gte: dayStart, $lte: dayEnd },
      status:    { $ne: 'CANCELLED' },
    })
    if (igConflict) {
      res.status(409).json({
        error: 'Faculty has an Integrated School (IG) class on this date and cannot be scheduled for Repeaters on the same day.',
        code:  'IG_SESSION_CONFLICT',
      })
      return
    }
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

  // M-7: Coordinators may only cancel sessions for their assigned batch.
  if (isCoordinator(req.user!.role)) {
    const targetSession = await Session.findById(sessionId).lean()
    if (!targetSession) { res.status(404).json({ error: 'Session not found' }); return }
    if (!req.user!.batchId || targetSession.batchId.toString() !== req.user!.batchId) {
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

  // Reset the BatchChapter flag so the chapter is no longer marked as done by faculty
  await BatchChapter.findOneAndUpdate(
    { sessionId: session._id },
    { $set: { facultyClassDone: false }, $unset: { facultyClassDoneAt: 1, sessionId: 1 } }
  ).catch(() => null)

  if (storedInitiator === 'FACULTY') {
    const contract = await PermanentFacultyContract.findOne({ facultyId: facultyOid })
    const penaltyAmount = contract?.cancellationPenaltyPerClass ?? 0

    await writeAuditLog({
      eventType: 'PENALTY_APPLIED',
      facultyId: facultyOid.toString(),
      facultyName,
      amount: penaltyAmount,
      reason: `Class cancelled by faculty on ${session.sessionDate.toDateString()}` +
        (penaltyAmount > 0 ? ` — penalty ₹${penaltyAmount.toLocaleString('en-IN')}` : ' — no penalty contract'),
      cancellationInitiator: 'FACULTY',
      sessionId: session._id.toString(),
      loggedByUserId: req.user!.userId,
    })
  } else {
    const initiatorLabel = cancellationInitiator === 'STUDENT' ? 'student' : 'management'
    await writeAuditLog({
      eventType: 'SESSION_CANCELLED',
      facultyId: facultyOid.toString(),
      facultyName,
      amount: 0,
      reason: `Session on ${session.sessionDate.toDateString()} cancelled by ${initiatorLabel}` +
        (cancellationReason ? ` — ${cancellationReason}` : ''),
      cancellationInitiator: storedInitiator,
      sessionId: session._id.toString(),
      loggedByUserId: req.user!.userId,
    })
  }

  res.json({ success: true, session })
})

/**
 * GET /academics/faculty-hours?month=M&year=Y
 * Returns all active faculty with their logged hours for the month,
 * and their contract quota where applicable.
 * No salary amounts are included — this is for ACADEMICS_MANAGER visibility only.
 */
export const getFacultyHoursSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const month = Number(req.query.month ?? new Date().getMonth() + 1)
  const year  = Number(req.query.year  ?? new Date().getFullYear())

  if (isNaN(month) || isNaN(year)) {
    res.status(400).json({ error: 'month and year must be numbers' }); return
  }

  const startDate = new Date(year, month - 1, 1)
  const endDate   = new Date(year, month,     1)

  const [facultyList, contracts, hoursAgg] = await Promise.all([
    Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
    PermanentFacultyContract.find({}).lean(),
    Session.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          sessionDate: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: '$facultyId',
          totalHours:   { $sum: '$durationHours' },
          sessionCount: { $sum: 1 },
        },
      },
    ]),
  ])

  const contractMap = new Map(contracts.map((c) => [c.facultyId.toString(), c]))
  const hoursMap    = new Map(
    (hoursAgg as { _id: Types.ObjectId; totalHours: number; sessionCount: number }[])
      .map((h) => [h._id.toString(), h])
  )

  const result = facultyList.map((f) => {
    const contract     = contractMap.get(f._id.toString())
    const hours        = hoursMap.get(f._id.toString())
    const logged       = hours?.totalHours  ?? 0
    const sessionCount = hours?.sessionCount ?? 0
    const contractType = contract?.contractType ?? 'UNKNOWN'

    // Determine the relevant quota for this contract type
    let quota: number | null = null
    if (contract) {
      quota = contract.monthlyHourQuota
        ?? contract.minHoursRequirement
        ?? null
    }

    const pct     = quota != null && quota > 0 ? Math.round((logged / quota) * 100) : null
    const deficit = quota != null ? Math.max(0, quota - logged) : null
    const surplus = quota != null ? Math.max(0, logged - quota) : null
    const status  = pct == null
      ? 'NO_QUOTA'
      : pct >= 100 ? 'MET' : pct >= 70 ? 'ON_TRACK' : pct >= 40 ? 'AT_RISK' : 'MISSED'

    return { facultyId: f._id, name: f.name, subject: f.subject, contractType, quota, logged, sessionCount, pct, deficit, surplus, status }
  })

  res.json({ month, year, faculty: result })
})
