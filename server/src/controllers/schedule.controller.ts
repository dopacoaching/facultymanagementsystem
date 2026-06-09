import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { WeeklySchedule } from '../models/WeeklySchedule'
import { BatchChapter } from '../models/BatchChapter'
import { Batch } from '../models/Batch'
import { asyncHandler } from '../utils/asyncHandler'
import { isVideoFirstBatch } from '../utils/batchUtils'
import { Types } from 'mongoose'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Given any Date, ensure time is at midnight (00:00:00.000) */
function midnight(d: Date | string): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

// ─── GET schedules ────────────────────────────────────────────────────────────

export const getSchedules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.query
  const filter: Record<string, unknown> = {}
  if (batchId) {
    try { filter.batchId = new Types.ObjectId(batchId as string) } catch {
      res.status(400).json({ error: 'Invalid batchId' }); return
    }
  }
  const schedules = await WeeklySchedule.find(filter)
    .populate('batchId', 'name type')
    .populate('classEntries.facultyId', 'name subject')
    .sort({ weekStartDate: -1 })
  res.json(schedules)
})

// ─── Create / update schedule ─────────────────────────────────────────────────

/**
 * POST /schedules — create or update a weekly schedule.
 * weekStartDate MUST be a Saturday.
 * weekEndDate is auto-computed as weekStartDate + 6 days (= following Friday).
 */
export const createOrUpdateSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId, weekStartDate, mondayExamTopic, fridayExamTopic, classEntries } = req.body
  if (!batchId || !weekStartDate) {
    res.status(400).json({ error: 'batchId and weekStartDate required' }); return
  }

  // Validate that all class sessions have a sessionDate and facultyId
  if (classEntries && Array.isArray(classEntries)) {
    for (const entry of classEntries) {
      if (entry.sessionType === 'LIVE_SESSION' || entry.sessionType === 'RECORDED_VIDEO') {
        if (!entry.sessionDate) {
          res.status(400).json({
            error: `Date is required for class session: ${entry.subject || 'unnamed'} - ${entry.chapter || 'unnamed'}`
          });
          return
        }
        if (!entry.facultyId) {
          res.status(400).json({
            error: `Faculty is required for class session: ${entry.subject || 'unnamed'} - ${entry.chapter || 'unnamed'}`
          });
          return
        }
      }
    }
  }

  let batchOid: Types.ObjectId
  try { batchOid = new Types.ObjectId(batchId) } catch {
    res.status(400).json({ error: 'Invalid batchId' }); return
  }

  const startDate = midnight(weekStartDate)

  // End date = start + 6 days
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const updateDoc: Record<string, unknown> = { weekEndDate: endDate }
  if (mondayExamTopic !== undefined) updateDoc.mondayExamTopic = mondayExamTopic
  if (fridayExamTopic !== undefined) updateDoc.fridayExamTopic = fridayExamTopic
  if (classEntries   !== undefined) updateDoc.classEntries    = classEntries

  // Check if there is an unpublished draft (could be original or revised)
  let schedule = await WeeklySchedule.findOne({
    batchId: batchOid,
    weekStartDate: startDate,
    isPublished: false
  })

  let isNew = false
  if (schedule) {
    // Update existing draft
    if (classEntries   !== undefined) schedule.classEntries   = classEntries
    if (mondayExamTopic !== undefined) schedule.mondayExamTopic = mondayExamTopic
    if (fridayExamTopic !== undefined) schedule.fridayExamTopic = fridayExamTopic
    schedule.weekEndDate = endDate
    await schedule.save()
    // Populate facultyId
    await schedule.populate('classEntries.facultyId', 'name subject')
  } else {
    isNew = true
    // Create new original draft
    schedule = await WeeklySchedule.create({
      batchId:            batchOid,
      weekStartDate:      startDate,
      weekEndDate:        endDate,
      mondayExamTopic,
      fridayExamTopic,
      classEntries:       classEntries ?? [],
      isRevised:          false,
      isPublished:        false,
    })
    await schedule.populate('classEntries.facultyId', 'name subject')
  }

  res.status(isNew ? 201 : 200).json(schedule)
})

// ─── Update exam topic ────────────────────────────────────────────────────────

/**
 * PATCH /schedules/:id/exam-topic — set or override Monday/Friday exam topic.
 * Body: { mondayExamTopic?: string, fridayExamTopic?: string }
 */
export const updateExamTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { mondayExamTopic, fridayExamTopic } = req.body

  if (mondayExamTopic === undefined && fridayExamTopic === undefined) {
    res.status(400).json({ error: 'Provide mondayExamTopic and/or fridayExamTopic' }); return
  }

  const schedule = await WeeklySchedule.findById(id)
  if (!schedule) { res.status(404).json({ error: 'Schedule not found' }); return }
  if (schedule.isPublished) {
    res.status(409).json({ error: 'Cannot edit a published schedule. Create a revision instead.' }); return
  }

  if (mondayExamTopic !== undefined) schedule.mondayExamTopic = mondayExamTopic
  if (fridayExamTopic !== undefined) schedule.fridayExamTopic = fridayExamTopic
  await schedule.save()
  res.json(schedule)
})

// ─── Publish ──────────────────────────────────────────────────────────────────

/**
 * POST /schedules/:id/publish
 * Publishes the schedule. Exam topics are managed independently and are
 * not required before publishing.
 */
export const publishSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const scheduleId = req.params.id ?? req.body.scheduleId
  if (!scheduleId) { res.status(400).json({ error: 'scheduleId required' }); return }

  const schedule = await WeeklySchedule.findById(scheduleId)
  if (!schedule) { res.status(404).json({ error: 'Schedule not found' }); return }

  if (schedule.isPublished) {
    res.status(409).json({
      error: 'Schedule already published. Create a revised version to make changes.',
    }); return
  }

  schedule.isPublished = true
  schedule.publishedAt = new Date()
  await schedule.save()
  res.json({ success: true, schedule })
})

// ─── Revise ───────────────────────────────────────────────────────────────────

/**
 * POST /schedules/:id/revise
 * Creates a new draft schedule that copies the published one.
 * The new revision carries replacesScheduleId = original._id.
 * When the revision is published it becomes the active schedule.
 */
export const reviseSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const original = await WeeklySchedule.findById(id)
  if (!original) { res.status(404).json({ error: 'Schedule not found' }); return }
  if (!original.isPublished) {
    res.status(400).json({ error: 'Only published schedules can be revised. Edit the draft directly instead.' }); return
  }

  // Check if a revision already exists for this week / batch, and return it if so
  const existing = await WeeklySchedule.findOne({
    batchId: original.batchId,
    weekStartDate: original.weekStartDate,
    isRevised: true,
    isPublished: false,
  }).populate('classEntries.facultyId', 'name subject')

  if (existing) {
    res.status(200).json({ success: true, revision: existing })
    return
  }

  const revision = await WeeklySchedule.create({
    batchId:            original.batchId,
    weekStartDate:      original.weekStartDate,
    weekEndDate:        original.weekEndDate,
    mondayExamTopic:    original.mondayExamTopic,
    fridayExamTopic:    original.fridayExamTopic,
    classEntries:       original.classEntries,
    isRevised:          true,
    replacesScheduleId: original._id,
  })

  res.status(201).json({ success: true, revision })
})

/**
 * DELETE /schedules/:id
 * Deletes an unpublished schedule draft or revision.
 */
export const deleteSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const schedule = await WeeklySchedule.findById(id)
  if (!schedule) { res.status(404).json({ error: 'Schedule not found' }); return }

  if (schedule.isPublished) {
    res.status(400).json({ error: 'Published schedules cannot be deleted.' }); return
  }

  await WeeklySchedule.findByIdAndDelete(id)
  res.json({ success: true, message: 'Draft deleted successfully' })
})

// ─── Exam topic auto-suggestion (full Cases 1–4) ──────────────────────────────

/**
 * GET /exams/suggest?batchId=&examDate=
 *
 * Returns:
 *  {
 *    suggestion: { topic, isPending, case, excluded[] },
 *    bySubject: [ { subject, chapters[] } ]   ← for manual override UI
 *  }
 *
 * Batch type determines whether videoComplete is required:
 *   RESIDENTIAL / ONLINE → both videoComplete AND facultyClassDone must be true
 *   OFFLINE              → only facultyClassDone required
 */
export const suggestTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId, examDate, weekStartDate } = req.query

  if (!batchId)    { res.status(400).json({ error: 'batchId required' }); return }
  if (!examDate)   { res.status(400).json({ error: 'examDate required' }); return }

  let batchOid: Types.ObjectId
  try { batchOid = new Types.ObjectId(batchId as string) } catch {
    res.status(400).json({ error: 'Invalid batchId' }); return
  }

  const batch = await Batch.findById(batchOid)
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return }

  const isOffline = !isVideoFirstBatch(batch.type)

  const examDateObj = midnight(examDate as string)
  const examDay     = examDateObj.getDay()   // 0 Sun · 1 Mon · 2 Tue · … · 5 Fri · 6 Sat

  // Auto-derive weekStartDate when the client doesn't send it (e.g. standalone
  // exams page). DOPA academic week starts on Saturday.
  //   Monday exam  → preceding Saturday = examDate − 2 days
  //   Friday exam  → preceding Saturday = examDate − 6 days
  //   Other days   → null (GAP 4/5 conditions won't fire)
  // NOTE: kept as a Date (NOT round-tripped through toISOString().slice(0,10)) —
  // that conversion shifts the calendar day by the server's UTC offset (e.g. IST),
  // producing an off-by-one Saturday. Date arithmetic via midnight()+setDate() is
  // timezone-stable because every comparison value is built the same way.
  let derivedWeekStart: Date | null = null
  if (weekStartDate) {
    derivedWeekStart = midnight(weekStartDate as string)
  } else if (examDay === 1) {
    derivedWeekStart = midnight(examDate as string)
    derivedWeekStart.setDate(derivedWeekStart.getDate() - 2)
  } else if (examDay === 5) {
    derivedWeekStart = midnight(examDate as string)
    derivedWeekStart.setDate(derivedWeekStart.getDate() - 6)
  }

  // ── GAP 4: Day-specific buffer cutoff ──────────────────────────────────────
  // Monday exam: use the (derived) weekStartDate — the preceding Saturday — as the
  // cutoff so chapters done on Saturday and Sunday are inside the buffer and excluded.
  // All other days: standard 1-day buffer (midnight of the day before the exam).
  let bufferCutoff: Date
  if (examDay === 1 && derivedWeekStart) {
    // Monday → cutoff = Saturday (derivedWeekStart)
    bufferCutoff = derivedWeekStart
  } else {
    bufferCutoff = midnight(examDate as string)
    bufferCutoff.setDate(bufferCutoff.getDate() - 1)
  }

  // Build base eligible query — Offline doesn't require videoComplete
  const eligibleFilter: Record<string, unknown> = {
    batchId: batchOid,
    facultyClassDone: true,
    facultyClassDoneAt: { $lt: bufferCutoff },
  }
  if (!isOffline) {
    eligibleFilter.videoComplete = true
  }

  const allEligible = await BatchChapter.find(eligibleFilter)
    .sort({ facultyClassDoneAt: -1 })

  // ── GAP 5: Friday exam prefers this-week chapters ──────────────────────────
  // For Friday, first try chapters completed since the week start (weekStartDate,
  // i.e. the preceding Saturday). If none exist in this window, fall back to all
  // eligible chapters and mark usedFallback = true for the client.
  let eligible = allEligible
  let usedFallback = false

  if (examDay === 5 && derivedWeekStart) {
    const weekStartMidnight = derivedWeekStart
    const thisWeek = allEligible.filter(
      (ch) => ch.facultyClassDoneAt != null && ch.facultyClassDoneAt >= weekStartMidnight,
    )
    if (thisWeek.length > 0) {
      eligible = thisWeek
    } else {
      usedFallback = true
      // eligible stays = allEligible (full fallback)
    }
  }

  // Find chapters excluded by the buffer (completed between bufferCutoff and exam day)
  const bufferFilter: Record<string, unknown> = {
    batchId: batchOid,
    facultyClassDone: true,
    facultyClassDoneAt: { $gte: bufferCutoff, $lt: examDateObj },
  }
  if (!isOffline) bufferFilter.videoComplete = true

  const bufferExcluded = await BatchChapter.find(bufferFilter)

  const excluded = bufferExcluded.map((ch) => ({
    chapterName: ch.chapterName,
    subject:     ch.subject,
    reason: `Completed ${ch.facultyClassDoneAt?.toDateString() ?? 'unknown'} — within buffer window before exam (${examDateObj.toDateString()})`,
  }))

  // Group eligible by subject (most recent first within each subject)
  const bySubjectMap: Record<string, string[]> = {}
  for (const ch of eligible) {
    if (!bySubjectMap[ch.subject]) bySubjectMap[ch.subject] = []
    bySubjectMap[ch.subject].push(ch.chapterName)
  }
  const subjects = Object.keys(bySubjectMap)

  // Build bySubject array for manual-override UI
  const bySubject = subjects.map((s) => ({ subject: s, chapters: bySubjectMap[s] }))

  // ── Apply Cases 1–4 ─────────────────────────────────────────────────────────

  type SuggestionCase = 1 | 2 | 3 | 4

  let topic: string
  let isPending: boolean
  let suggestedCase: SuggestionCase

  if (eligible.length === 0) {
    // CASE 4: no eligible chapters at all
    topic         = '[Topic Pending — Academics to confirm]'
    isPending     = true
    suggestedCase = 4
  } else if (subjects.length === 1 && bySubjectMap[subjects[0]].length >= 2) {
    // CASE 1: 2+ chapters from same subject
    const [ch1, ch2] = bySubjectMap[subjects[0]]
    topic         = `Exam: ${ch1} + ${ch2}`
    isPending     = false
    suggestedCase = 1
  } else if (subjects.length >= 2) {
    // CASE 2: chapters from 2 different subjects
    const ch1 = bySubjectMap[subjects[0]][0]
    const ch2 = bySubjectMap[subjects[1]][0]
    topic         = `Exam: ${ch1} + ${ch2}`
    isPending     = false
    suggestedCase = 2
  } else {
    // CASE 3: exactly 1 chapter total
    topic         = `Exam: ${eligible[0].chapterName}`
    isPending     = false
    suggestedCase = 3
  }

  res.json({
    suggestion: { topic, isPending, case: suggestedCase, excluded, usedFallback },
    bySubject,
  })
})

// ─── Chapters ─────────────────────────────────────────────────────────────────

/**
 * GET /chapters/summary?batchIds=id1,id2,...
 * Returns aggregated chapter stats for multiple batches in a single DB query.
 * Replaces the N parallel /chapters?batchId=X calls from the academics dashboard.
 */
export const getChapterSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchIds } = req.query
  if (!batchIds || typeof batchIds !== 'string') {
    res.status(400).json({ error: 'batchIds query param required (comma-separated ObjectIds)' }); return
  }

  const ids: Types.ObjectId[] = []
  for (const raw of batchIds.split(',').map((s) => s.trim()).filter(Boolean)) {
    try { ids.push(new Types.ObjectId(raw)) } catch { /* skip invalid */ }
  }
  if (ids.length === 0) { res.json([]); return }

  const rows = await BatchChapter.aggregate([
    { $match: { batchId: { $in: ids } } },
    {
      $group: {
        _id:              '$batchId',
        totalChapters:    { $sum: 1 },
        videoComplete:    { $sum: { $cond: ['$videoComplete', 1, 0] } },
        facultyClassDone: { $sum: { $cond: ['$facultyClassDone', 1, 0] } },
        pendingVideo:     { $sum: { $cond: [{ $and: ['$facultyClassDone', { $not: '$videoComplete' }] }, 1, 0] } },
      },
    },
    { $project: { batchId: '$_id', totalChapters: 1, videoComplete: 1, facultyClassDone: 1, pendingVideo: 1, _id: 0 } },
  ])

  res.json(rows)
})

export const getChapters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId, subject } = req.query
  const filter: Record<string, unknown> = {}
  if (batchId) {
    try { filter.batchId = new Types.ObjectId(batchId as string) } catch {}
  }
  if (subject) filter.subject = subject
  const chapters = await BatchChapter.find(filter).sort({ subject: 1, chapterOrder: 1 })
  res.json(chapters)
})

/**
 * PATCH /chapters/:id — update chapter completion flags.
 * Coordinators can mark videoComplete = true.
 * facultyClassDone is auto-set by session creation; manual override is manager-only.
 */
export const updateChapter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { videoComplete, facultyClassDone, sessionId } = req.body
  const now = new Date()
  const update: Record<string, unknown> = {}

  if (videoComplete !== undefined) {
    update.videoComplete = Boolean(videoComplete)
    update.videoCompletedAt = videoComplete ? now : null
  }
  if (facultyClassDone !== undefined) {
    update.facultyClassDone = Boolean(facultyClassDone)
    update.facultyClassDoneAt = facultyClassDone ? now : null
    update.sessionId = facultyClassDone ? (sessionId ?? null) : null
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: 'Provide videoComplete and/or facultyClassDone' }); return
  }

  const chapter = await BatchChapter.findByIdAndUpdate(id, update, { new: true })
  if (!chapter) { res.status(404).json({ error: 'Chapter not found' }); return }
  res.json(chapter)
})
