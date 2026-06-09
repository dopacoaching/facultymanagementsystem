import { Response }    from 'express'
import { AuthRequest } from '../middleware/auth'
import { Types }       from 'mongoose'
import { ISTimetableSlot } from '../models/ISTimetableSlot'
import { ISBatchChapter }  from '../models/ISBatchChapter'
import { SpecialDay }      from '../models/SpecialDay'
import { Batch }           from '../models/Batch'
import { asyncHandler }    from '../utils/asyncHandler'
import { checkISConflicts } from '../services/integratedSchool/conflictChecker'
import { getBatchTimings, applyExamDayTimings } from '../services/integratedSchool/timings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function midnight(d: string | Date): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMETABLE — ASSIGN / GET / UPDATE / DELETE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /integrated-school/timetable/assign
 * Assigns a class to a specific date + time slot for a batch.
 * Runs all 5 conflict checks before saving.
 */
export const assignSlot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, campusId, batchId, facultyId, subject, chapter, startTime, durationHours, timeSlot, sessionType, notes, isUnplanned } = req.body

  if (!date || !campusId || !batchId || !subject || !chapter || !timeSlot) {
    res.status(400).json({
      error: 'date, campusId, batchId, subject, chapter, timeSlot are required',
    })
    return
  }
  if (!['SESSION_1', 'SESSION_2', 'SESSION_3'].includes(timeSlot)) {
    res.status(400).json({ error: 'timeSlot must be SESSION_1, SESSION_2, or SESSION_3' })
    return
  }

  let campusOid: Types.ObjectId, batchOid: Types.ObjectId
  try { campusOid = new Types.ObjectId(campusId) } catch {
    res.status(400).json({ error: 'Invalid campusId' }); return
  }
  try { batchOid = new Types.ObjectId(batchId) } catch {
    res.status(400).json({ error: 'Invalid batchId' }); return
  }
  let facultyOid: Types.ObjectId | undefined
  if (facultyId) {
    try { facultyOid = new Types.ObjectId(facultyId) } catch {
      res.status(400).json({ error: 'Invalid facultyId' }); return
    }
  }

  const slotDate = midnight(date)

  // Run conflict checks
  const { hasConflict, violations } = await checkISConflicts({
    date:      slotDate,
    campusId:  campusOid,
    batchId:   batchOid,
    facultyId: facultyOid,
    timeSlot,
  })
  if (hasConflict) {
    res.status(409).json({ error: 'Scheduling conflict detected', violations })
    return
  }

  const slot = await ISTimetableSlot.create({
    date:          slotDate,
    campusId:      campusOid,
    batchId:       batchOid,
    facultyId:     facultyOid ?? null,
    subject,
    chapter,
    startTime:     startTime    ?? undefined,
    durationHours: durationHours != null ? Number(durationHours) : undefined,
    timeSlot,
    sessionType:   sessionType  ?? 'LIVE_SESSION',
    notes:         notes        ?? undefined,
    isUnplanned:   Boolean(isUnplanned),
  })

  // Auto-mark the ISBatchChapter as SCHEDULED
  await ISBatchChapter.findOneAndUpdate(
    { batchId: batchOid, chapterName: chapter, subject },
    {
      $set: {
        status:         'SCHEDULED',
        scheduledDate:  slotDate,
        timetableSlotId: slot._id,
      },
    },
    { upsert: false }  // only update if chapter exists; untracked chapters are fine
  )

  const populated = await slot.populate([
    { path: 'batchId',   select: 'name type ig1Subgroup' },
    { path: 'facultyId', select: 'name subject' },
    { path: 'campusId',  select: 'name location' },
  ])
  res.status(201).json(populated)
})

// ─── Daily timetable ──────────────────────────────────────────────────────────

/**
 * GET /integrated-school/timetable/daily?date=&campusId=
 * Returns all slots for a specific date, optionally filtered by campus.
 * Also returns special-day metadata and resolved timings per batch.
 */
export const getDailyTimetable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, campusId } = req.query as Record<string, string>
  if (!date) { res.status(400).json({ error: 'date required' }); return }

  const dayStart = midnight(date)
  const dayEnd   = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999)

  const filter: Record<string, unknown> = { date: { $gte: dayStart, $lte: dayEnd } }
  if (campusId) {
    try { filter.campusId = new Types.ObjectId(campusId) } catch {}
  }

  const [slots, specialDays] = await Promise.all([
    ISTimetableSlot.find(filter)
      .populate('batchId',   'name type ig1Subgroup campusId')
      .populate('facultyId', 'name subject')
      .populate('campusId',  'name location')
      .sort({ timeSlot: 1, 'batchId.name': 1 }),
    SpecialDay.find({
      date: { $gte: dayStart, $lte: dayEnd },
      $or: campusId
        ? [{ campusId: new Types.ObjectId(campusId) }, { campusId: { $exists: false } }, { campusId: null }]
        : [{}],
    }).populate('campusId', 'name'),
  ])

  // Attach resolved timings to each slot
  const dayOfWeek = dayStart.getDay()
  const weekday = dayOfWeek === 1 ? 'MONDAY' : dayOfWeek === 5 ? 'FRIDAY' : null

  const slotsWithTimings = slots.map((slot) => {
    const batch = slot.batchId as unknown as { ig1Subgroup?: string }
    const base  = getBatchTimings(batch?.ig1Subgroup)
    const timings = weekday ? applyExamDayTimings(weekday, base) : base
    return { ...slot.toObject(), timings }
  })

  res.json({ slots: slotsWithTimings, specialDays, date: dayStart })
})

// ─── Weekly timetable ─────────────────────────────────────────────────────────

/**
 * GET /integrated-school/timetable/weekly?weekStart=YYYY-MM-DD&batchId=&campusId=&facultyId=
 * weekStart is any date — we compute the Monday of that week.
 */
export const getWeeklyTimetable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { weekStart, batchId, campusId, facultyId } = req.query as Record<string, string>
  if (!weekStart) { res.status(400).json({ error: 'weekStart required' }); return }

  // Find Monday of the week containing weekStart
  const ref = new Date(weekStart); ref.setHours(0, 0, 0, 0)
  const dow = ref.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(ref); monday.setDate(ref.getDate() + mondayOffset)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999)

  const filter: Record<string, unknown> = { date: { $gte: monday, $lte: sunday } }
  if (batchId)   { try { filter.batchId   = new Types.ObjectId(batchId)   } catch {} }
  if (campusId)  { try { filter.campusId  = new Types.ObjectId(campusId)  } catch {} }
  if (facultyId) { try { filter.facultyId = new Types.ObjectId(facultyId) } catch {} }

  const [slots, specialDays] = await Promise.all([
    ISTimetableSlot.find(filter)
      .populate('batchId',   'name type ig1Subgroup campusId')
      .populate('facultyId', 'name subject')
      .populate('campusId',  'name location')
      .sort({ date: 1, timeSlot: 1 }),
    SpecialDay.find({
      date: { $gte: monday, $lte: sunday },
    }).populate('campusId', 'name'),
  ])

  // Attach resolved timings per slot (same as daily view, keyed on each slot's day)
  const slotsWithTimings = slots.map((slot) => {
    const dow = new Date(slot.date).getDay()
    const weekday = dow === 1 ? 'MONDAY' : dow === 5 ? 'FRIDAY' : null
    const batch   = slot.batchId as unknown as { ig1Subgroup?: string }
    const base    = getBatchTimings(batch?.ig1Subgroup)
    const timings = weekday ? applyExamDayTimings(weekday, base) : base
    return { ...slot.toObject(), timings }
  })

  res.json({ slots: slotsWithTimings, specialDays, weekStart: monday, weekEnd: sunday })
})

// ─── Update slot (status / fields) ───────────────────────────────────────────

/**
 * PATCH /integrated-school/timetable/:id
 * Allowed updates: status (PLANNED→COMPLETED/CANCELLED), facultyId, notes.
 * Re-runs conflict check if facultyId or timeSlot changes.
 */
export const updateSlot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { status, facultyId, notes, chapter, subject, startTime, durationHours } = req.body

  const slot = await ISTimetableSlot.findById(id)
  if (!slot) { res.status(404).json({ error: 'Timetable slot not found' }); return }
  if (slot.status === 'CANCELLED') {
    res.status(409).json({ error: 'Cannot update a cancelled slot' }); return
  }

  const update: Record<string, unknown> = {}

  if (status !== undefined) {
    const allowed = ['PLANNED', 'COMPLETED', 'CANCELLED']
    if (!allowed.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` }); return
    }
    // Prevent reverting a COMPLETED slot back to PLANNED — ISBatchChapter would be out of sync
    if (status === 'PLANNED' && slot.status === 'COMPLETED') {
      res.status(409).json({ error: 'Cannot revert a completed slot back to planned. Cancel it and create a new one.' }); return
    }
    update.status = status
  }
  if (notes         !== undefined) update.notes         = notes
  if (chapter       !== undefined) update.chapter       = chapter
  if (subject       !== undefined) update.subject       = subject
  if (startTime     !== undefined) update.startTime     = startTime
  if (durationHours !== undefined) update.durationHours = Number(durationHours)

  // Updating facultyId requires re-running conflict check
  if (facultyId !== undefined) {
    let newFacultyOid: Types.ObjectId | null = null
    if (facultyId) {
      try { newFacultyOid = new Types.ObjectId(facultyId) } catch {
        res.status(400).json({ error: 'Invalid facultyId' }); return
      }
      const { hasConflict, violations } = await checkISConflicts({
        date:      slot.date,
        campusId:  slot.campusId,
        batchId:   slot.batchId,
        facultyId: newFacultyOid,
        timeSlot:  slot.timeSlot,
        excludeId: slot._id as Types.ObjectId,
      })
      if (hasConflict) {
        res.status(409).json({ error: 'Scheduling conflict detected', violations }); return
      }
    }
    update.facultyId = newFacultyOid
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: 'Nothing to update' }); return
  }

  const updated = await ISTimetableSlot.findByIdAndUpdate(id, update, { new: true })
    .populate('batchId',   'name type ig1Subgroup')
    .populate('facultyId', 'name subject')
    .populate('campusId',  'name location')

  // Use the effective chapter/subject — the update may have renamed them
  const effectiveChapter = (update.chapter as string) ?? slot.chapter
  const effectiveSubject = (update.subject as string) ?? slot.subject

  // If chapter or subject was renamed without a status change, sync the ISBatchChapter
  // key so it doesn't become orphaned under the old name.
  if (update.status === undefined && (update.chapter !== undefined || update.subject !== undefined)) {
    await ISBatchChapter.findOneAndUpdate(
      { batchId: slot.batchId, chapterName: slot.chapter, subject: slot.subject },
      {
        $set: {
          ...(update.chapter !== undefined ? { chapterName: update.chapter as string } : {}),
          ...(update.subject !== undefined ? { subject: update.subject as string } : {}),
        },
      },
      { upsert: false },
    )
  }

  // If completed, auto-mark ISBatchChapter
  if (update.status === 'COMPLETED') {
    await ISBatchChapter.findOneAndUpdate(
      { batchId: slot.batchId, chapterName: effectiveChapter, subject: effectiveSubject },
      {
        $set: {
          status:         'COMPLETED',
          completedDate:  new Date(),
          timetableSlotId: slot._id,
        },
      },
      { upsert: false }
    )
  }
  if (update.status === 'CANCELLED') {
    // Reset to NOT_YET_SCHEDULED so the chapter can be re-scheduled on another date.
    // Setting CANCELLED here would permanently block re-scheduling via the normal flow.
    await ISBatchChapter.findOneAndUpdate(
      { batchId: slot.batchId, chapterName: effectiveChapter, subject: effectiveSubject },
      {
        $set:   { status: 'NOT_YET_SCHEDULED' },
        $unset: { scheduledDate: 1, timetableSlotId: 1 },
      },
      { upsert: false }
    )
  }

  res.json(updated)
})

/**
 * DELETE /integrated-school/timetable/:id
 * Hard-deletes a PLANNED slot. Resets linked ISBatchChapter to NOT_YET_SCHEDULED.
 */
export const deleteSlot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const slot = await ISTimetableSlot.findById(req.params.id)
  if (!slot) { res.status(404).json({ error: 'Timetable slot not found' }); return }
  if (slot.status !== 'PLANNED') {
    res.status(409).json({ error: 'Only PLANNED slots can be deleted. Cancel completed/cancelled slots instead.' }); return
  }

  await Promise.all([
    slot.deleteOne(),
    ISBatchChapter.findOneAndUpdate(
      { batchId: slot.batchId, chapterName: slot.chapter, subject: slot.subject, timetableSlotId: slot._id },
      {
        $set:   { status: 'NOT_YET_SCHEDULED' },
        $unset: { scheduledDate: 1, timetableSlotId: 1 },
      }
    ),
  ])
  res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  SPECIAL DAYS
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /integrated-school/special-days?from=&to=&campusId= */
export const getSpecialDays = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { from, to, campusId } = req.query as Record<string, string>
  const filter: Record<string, unknown> = {}

  if (from || to) {
    filter.date = {}
    if (from) (filter.date as Record<string, unknown>).$gte = midnight(from)
    if (to) {
      const end = midnight(to); end.setHours(23, 59, 59, 999)
      ;(filter.date as Record<string, unknown>).$lte = end
    }
  }
  if (campusId) {
    try {
      const cOid = new Types.ObjectId(campusId)
      filter.$or = [{ campusId: cOid }, { campusId: { $exists: false } }, { campusId: null }]
    } catch {}
  }

  const days = await SpecialDay.find(filter)
    .populate('campusId', 'name')
    .sort({ date: 1 })
  res.json(days)
})

/** POST /integrated-school/special-days */
export const createSpecialDay = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, campusId, type, notes } = req.body
  if (!date || !type) {
    res.status(400).json({ error: 'date and type are required' }); return
  }

  const dayData: Record<string, unknown> = {
    date:  midnight(date),
    type,
    notes: notes ?? undefined,
  }
  if (campusId) {
    try { dayData.campusId = new Types.ObjectId(campusId) } catch {
      res.status(400).json({ error: 'Invalid campusId' }); return
    }
  }

  try {
    const day = await SpecialDay.create(dayData)
    const populated = await day.populate('campusId', 'name')
    res.status(201).json(populated)
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code === 11000) {
      res.status(409).json({ error: 'A special day of this type already exists for this campus on this date' }); return
    }
    throw err
  }
})

/** DELETE /integrated-school/special-days/:id */
export const deleteSpecialDay = asyncHandler(async (req: AuthRequest, res: Response) => {
  const day = await SpecialDay.findByIdAndDelete(req.params.id)
  if (!day) { res.status(404).json({ error: 'Special day not found' }); return }
  res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  IS BATCH CHAPTERS
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /integrated-school/chapters?batchId=&subject=&status= */
export const getISChapters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId, subject, status } = req.query as Record<string, string>
  const filter: Record<string, unknown> = {}

  if (batchId)  { try { filter.batchId = new Types.ObjectId(batchId) } catch {} }
  if (subject)  { filter.subject = subject }
  if (status)   { filter.status  = status  }

  const chapters = await ISBatchChapter.find(filter).sort({ subject: 1, chapterOrder: 1 })
  res.json(chapters)
})

/** PATCH /integrated-school/chapters/:id — manual status override */
export const updateISChapter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, chapterOrder, scheduledDate, completedDate } = req.body
  const update: Record<string, unknown> = {}

  const VALID_STATUS = ['NOT_YET_SCHEDULED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` }); return
    }
    update.status = status
  }
  if (chapterOrder  !== undefined) update.chapterOrder  = Number(chapterOrder)
  if (scheduledDate !== undefined) update.scheduledDate = scheduledDate ? new Date(scheduledDate) : null
  if (completedDate !== undefined) update.completedDate = completedDate ? new Date(completedDate) : null

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: 'Nothing to update' }); return
  }

  const chapter = await ISBatchChapter.findByIdAndUpdate(req.params.id, update, { new: true })
  if (!chapter) { res.status(404).json({ error: 'IS chapter not found' }); return }
  res.json(chapter)
})

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMINGS — public endpoint for UI to resolve exact times
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /integrated-school/timings?batchId=&date=
 * Returns the resolved start/end times for morning + afternoon for the batch on that date.
 */
export const getTimings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId, date } = req.query as Record<string, string>
  if (!batchId || !date) {
    res.status(400).json({ error: 'batchId and date required' }); return
  }

  let batchOid: Types.ObjectId
  try { batchOid = new Types.ObjectId(batchId) } catch {
    res.status(400).json({ error: 'Invalid batchId' }); return
  }

  const batch = await Batch.findById(batchOid)
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return }

  const base = getBatchTimings(batch.ig1Subgroup)
  const d    = new Date(date)
  const dow  = d.getDay()
  const weekday = dow === 1 ? 'MONDAY' : dow === 5 ? 'FRIDAY' : null
  const timings  = weekday ? applyExamDayTimings(weekday, base) : base

  // Check for special day exam overrides
  const dayStart = midnight(date)
  const dayEnd   = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999)
  const specialDay = await SpecialDay.findOne({
    date: { $gte: dayStart, $lte: dayEnd },
    $or: [{ campusId: batch.campusId }, { campusId: { $exists: false } }, { campusId: null }],
    type: { $in: ['MONDAY_EXAM', 'FRIDAY_EXAM', 'WEEKLY_EXAM'] },
  })

  res.json({ batchId, date, ig1Subgroup: batch.ig1Subgroup ?? null, timings, specialDay: specialDay ?? null })
})
