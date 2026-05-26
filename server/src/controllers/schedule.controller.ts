import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { WeeklySchedule } from '../models/WeeklySchedule'
import { BatchChapter } from '../models/BatchChapter'
import { Batch } from '../models/Batch'
import { asyncHandler } from '../utils/asyncHandler'
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
    try { filter.batchId = new Types.ObjectId(batchId as string) } catch {}
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

  let batchOid: Types.ObjectId
  try { batchOid = new Types.ObjectId(batchId) } catch {
    res.status(400).json({ error: 'Invalid batchId' }); return
  }

  const startDate = midnight(weekStartDate)

  // Validate: weekStartDate must be a Saturday (getDay() === 6)
  if (startDate.getDay() !== 6) {
    res.status(400).json({
      error: `weekStartDate must be a Saturday. Received: ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][startDate.getDay()]}`,
    })
    return
  }

  // End date = Saturday + 6 = Friday
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const updateDoc: Record<string, unknown> = { weekEndDate: endDate }
  if (mondayExamTopic !== undefined) updateDoc.mondayExamTopic = mondayExamTopic
  if (fridayExamTopic !== undefined) updateDoc.fridayExamTopic = fridayExamTopic
  if (classEntries   !== undefined) updateDoc.classEntries    = classEntries

  const schedule = await WeeklySchedule.findOneAndUpdate(
    { batchId: batchOid, weekStartDate: startDate },
    updateDoc,
    { upsert: true, new: true }
  ).populate('classEntries.facultyId', 'name subject')

  res.status(201).json(schedule)
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
 * Hard gate: both exam topics must be non-empty strings.
 * Once published, the schedule is locked.
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

  // HARD GATE
  const missing: string[] = []
  if (!schedule.mondayExamTopic?.trim()) missing.push('Monday')
  if (!schedule.fridayExamTopic?.trim()) missing.push('Friday')
  if (missing.length > 0) {
    res.status(422).json({
      error: `Cannot publish — exam topics missing for: ${missing.join(', ')}`,
      blocked: true,
      missingTopics: missing,
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

  // Check no revision already exists for this week / batch
  const existing = await WeeklySchedule.findOne({
    batchId: original.batchId,
    weekStartDate: original.weekStartDate,
    isRevised: true,
    isPublished: false,
  })
  if (existing) {
    res.status(409).json({
      error: 'An unpublished revision already exists for this week.',
      revisionId: existing._id,
    }); return
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

  if (!batchId) { res.status(400).json({ error: 'batchId required' }); return }

  const rawDate = (examDate ?? weekStartDate) as string | undefined
  if (!rawDate) { res.status(400).json({ error: 'examDate required' }); return }

  let batchOid: Types.ObjectId
  try { batchOid = new Types.ObjectId(batchId as string) } catch {
    res.status(400).json({ error: 'Invalid batchId' }); return
  }

  const batch = await Batch.findById(batchOid)
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return }

  const isOffline = batch.type === 'OFFLINE'

  // 1-day buffer: chapters must be done BEFORE (examDate - 1 day) at midnight
  const bufferCutoff = midnight(rawDate)
  bufferCutoff.setDate(bufferCutoff.getDate() - 1)
  // bufferCutoff is now midnight of the day before the exam

  const examDateObj = midnight(rawDate)

  // Build base query — Offline doesn't require videoComplete
  const eligibleFilter: Record<string, unknown> = {
    batchId: batchOid,
    facultyClassDone: true,
    facultyClassDoneAt: { $lt: bufferCutoff },
  }
  if (!isOffline) {
    eligibleFilter.videoComplete = true
  }

  const eligible = await BatchChapter.find(eligibleFilter)
    .sort({ facultyClassDoneAt: -1 })

  // Find chapters excluded by the 1-day buffer (completed between cutoff and exam day)
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
    reason: `Completed ${ch.facultyClassDoneAt?.toDateString() ?? 'unknown'} — within 1-day buffer of exam (${examDateObj.toDateString()})`,
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
    topic      = '[Topic Pending — Academics to confirm]'
    isPending  = true
    suggestedCase = 4
  } else if (subjects.length === 1 && bySubjectMap[subjects[0]].length >= 2) {
    // CASE 1: 2+ chapters from same subject
    const [ch1, ch2] = bySubjectMap[subjects[0]]
    topic      = `Exam: ${ch1} + ${ch2}`
    isPending  = false
    suggestedCase = 1
  } else if (subjects.length >= 2) {
    // CASE 2: chapters from 2 different subjects
    const ch1 = bySubjectMap[subjects[0]][0]
    const ch2 = bySubjectMap[subjects[1]][0]
    topic      = `Exam: ${ch1} + ${ch2}`
    isPending  = false
    suggestedCase = 2
  } else {
    // CASE 3: exactly 1 chapter total
    topic      = `Exam: ${eligible[0].chapterName}`
    isPending  = false
    suggestedCase = 3
  }

  res.json({
    suggestion: { topic, isPending, case: suggestedCase, excluded },
    bySubject,
  })
})

// ─── Chapters ─────────────────────────────────────────────────────────────────

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
