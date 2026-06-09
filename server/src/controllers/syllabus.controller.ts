import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { SyllabusChapter } from '../models/SyllabusChapter'
import { BatchChapter } from '../models/BatchChapter'
import { Batch } from '../models/Batch'
import { asyncHandler } from '../utils/asyncHandler'
import { Types } from 'mongoose'
import { Subject, SUBJECTS } from '../types'

const MONTH_NAMES: Record<number, string> = {
  6: 'June', 7: 'July', 8: 'August', 9: 'September',
  10: 'October', 11: 'November', 12: 'December',
}

// ── GET /academics/syllabus ───────────────────────────────────────────────────
// Full annual syllabus grouped by month and subject.
export const getAnnualSyllabus = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const chapters = await SyllabusChapter.find()
    .sort({ scheduledMonth: 1, subject: 1, chapterOrder: 1 })

  // Group by month → subject → chapters
  const grouped: Record<string, {
    monthName: string
    subjects: Record<string, typeof chapters>
  }> = {}

  for (const ch of chapters) {
    const key = String(ch.scheduledMonth)
    if (!grouped[key]) {
      grouped[key] = { monthName: MONTH_NAMES[ch.scheduledMonth], subjects: {} }
    }
    const subj = ch.subject as string
    if (!grouped[key].subjects[subj]) {
      grouped[key].subjects[subj] = []
    }
    grouped[key].subjects[subj].push(ch)
  }

  res.json(grouped)
})

// ── GET /academics/syllabus/chapters ─────────────────────────────────────────
// Chapters filtered by subject and optionally month. Used to populate dropdowns.
export const getSyllabusChapters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subject, month } = req.query as Record<string, string | undefined>

  if (!subject) {
    res.status(400).json({ error: 'subject query parameter is required' }); return
  }

  const subjectUp = subject.toUpperCase() as Subject
  if (!SUBJECTS.includes(subjectUp)) {
    res.status(400).json({ error: `subject must be one of: ${SUBJECTS.join(', ')}` }); return
  }

  const filter: Record<string, unknown> = { subject: subjectUp }
  if (month) {
    const m = Number(month)
    if (isNaN(m) || m < 6 || m > 12) {
      res.status(400).json({ error: 'month must be 6–12' }); return
    }
    filter.scheduledMonth = m
  }

  const chapters = await SyllabusChapter.find(filter)
    .populate('parentChapterId', 'chapterName scheduledMonth')
    .sort({ globalOrder: 1 })

  res.json(chapters)
})

// ── GET /academics/syllabus/split-chapters ────────────────────────────────────
// All split chapter pairs with per-batch status.
export const getSplitChapters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.query as Record<string, string | undefined>

  // Validate batchId before querying so we don't do work only to fail mid-loop
  let batchOid: Types.ObjectId | undefined
  if (batchId) {
    try { batchOid = new Types.ObjectId(batchId) } catch {
      res.status(400).json({ error: 'Invalid batchId' }); return
    }
  }

  const [splitPart1s, splitPart2s] = await Promise.all([
    SyllabusChapter.find({ isSplitPart: true, splitPartNumber: 1 }).sort({ subject: 1, scheduledMonth: 1 }),
    SyllabusChapter.find({ isSplitPart: true, splitPartNumber: 2 }),
  ])

  // Build map: splitGroup → Part 2 doc (scoped by subject for safety)
  const part2Map = new Map(splitPart2s.map((p) => [`${p.subject}::${p.splitGroup}`, p]))

  const result = []
  for (const part1 of splitPart1s) {
    const part2 = part2Map.get(`${part1.subject}::${part1.splitGroup}`)
    if (!part2) continue

    const pair: Record<string, unknown> = {
      subject:    part1.subject,
      splitGroup: part1.splitGroup,
      part1: { id: part1._id, chapterName: part1.chapterName, scheduledMonth: part1.scheduledMonth },
      part2: { id: part2._id, chapterName: part2.chapterName, scheduledMonth: part2.scheduledMonth },
    }

    if (batchOid) {
      const [bc1, bc2] = await Promise.all([
        BatchChapter.findOne({ batchId: batchOid, syllabusChapterId: part1._id }),
        BatchChapter.findOne({ batchId: batchOid, syllabusChapterId: part2._id }),
      ])
      pair.batchStatus = {
        part1Done:    bc1?.facultyClassDone  ?? false,
        part1DoneAt:  bc1?.facultyClassDoneAt ?? null,
        part2Done:    bc2?.facultyClassDone  ?? false,
        part2DoneAt:  bc2?.facultyClassDoneAt ?? null,
        part2Unlocked: bc1?.facultyClassDone ?? false,
      }
    }

    result.push(pair)
  }

  res.json(result)
})

// ── GET /academics/syllabus/progress/:batchId ─────────────────────────────────
// Per-batch monthly progress table for all subjects.
export const getBatchProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const batchId = req.params.batchId as string
  let batchOid: Types.ObjectId
  try { batchOid = new Types.ObjectId(batchId) } catch {
    res.status(400).json({ error: 'Invalid batchId' }); return
  }

  const batch = await Batch.findById(batchOid)
  if (!batch) { res.status(404).json({ error: 'Batch not found' }); return }

  const [allSyllabus, batchChapters] = await Promise.all([
    SyllabusChapter.find().sort({ scheduledMonth: 1, subject: 1, chapterOrder: 1 }),
    BatchChapter.find({ batchId: batchOid, syllabusChapterId: { $exists: true } }),
  ])

  // Build lookup: syllabusChapterId → BatchChapter
  const bcMap = new Map(
    batchChapters.map((bc) => [bc.syllabusChapterId!.toString(), bc])
  )

  const progress: Record<string, Record<string, {
    monthName: string
    chaptersPlanned: number
    chaptersCompleted: number
    chaptersOnTime: number
    chaptersLate: number
    status: 'ON_TRACK' | 'SLIGHTLY_BEHIND' | 'BEHIND' | 'NOT_STARTED' | 'COMPLETED'
  }>> = {}

  for (const subj of SUBJECTS) {
    progress[subj] = {}
    const subjChapters = allSyllabus.filter((c) => c.subject === subj)

    for (let month = 6; month <= 12; month++) {
      const monthChapters = subjChapters.filter((c) => c.scheduledMonth === month)
      if (monthChapters.length === 0) continue

      let completed = 0
      let onTime = 0
      let late = 0

      for (const sc of monthChapters) {
        const bc = bcMap.get(sc._id.toString())
        if (!bc?.facultyClassDone) continue
        completed++

        if (bc.facultyClassDoneAt) {
          const doneDate  = new Date(bc.facultyClassDoneAt)
          const doneMonth = doneDate.getMonth() + 1  // 1–12

          // Academic year is June(6)–December(12) in a single calendar year.
          // Jan–May (1–5) belong to the next calendar year → always late.
          // Within the academic window: on time if completed by the scheduled month.
          if (doneMonth >= 6 && doneMonth <= month) onTime++
          else late++
        } else {
          // Done flag is set but timestamp is missing — count as late so
          // chaptersOnTime + chaptersLate always equals chaptersCompleted.
          late++
        }
      }

      const planned = monthChapters.length
      const behind  = planned - completed
      let status: 'ON_TRACK' | 'SLIGHTLY_BEHIND' | 'BEHIND' | 'NOT_STARTED' | 'COMPLETED'
      if (completed === 0)       status = 'NOT_STARTED'
      else if (behind === 0)     status = 'ON_TRACK'
      else if (behind === 1)     status = 'SLIGHTLY_BEHIND'
      else                       status = 'BEHIND'

      progress[subj][String(month)] = {
        monthName: MONTH_NAMES[month],
        chaptersPlanned:  planned,
        chaptersCompleted: completed,
        chaptersOnTime:   onTime,
        chaptersLate:     late,
        status,
      }
    }

    // Override all months to COMPLETED only when every syllabus chapter for
    // the subject has a linked BatchChapter that is marked done.
    const totalSubjChapters = subjChapters.length
    const linkedDoneCount = subjChapters.filter((sc) => {
      const bc = bcMap.get(sc._id.toString())
      return bc?.facultyClassDone === true
    }).length

    if (linkedDoneCount === totalSubjChapters && totalSubjChapters > 0) {
      for (const key of Object.keys(progress[subj])) {
        progress[subj][key].status = 'COMPLETED'
      }
    }
  }

  res.json({ batchId, batchName: batch.name, progress })
})

// ── GET /academics/syllabus/behind ────────────────────────────────────────────
// Batches behind schedule. Defaults to current calendar month; accepts ?month=N.
// Only counts chapters that have been linked to the syllabus via syllabusChapterId.
export const getBehindScheduleBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const queryMonth = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1

  if (isNaN(queryMonth) || queryMonth < 6 || queryMonth > 12) {
    res.status(400).json({ error: 'month must be between 6 (June) and 12 (December)' }); return
  }

  const batches = await Batch.find({
    type:     { $in: ['RESIDENTIAL', 'OFFLINE', 'ONLINE'] },
    isActive: true,
  })

  const syllabusThisMonth = await SyllabusChapter.find({ scheduledMonth: queryMonth })
  if (syllabusThisMonth.length === 0) {
    res.json({ month: queryMonth, batches: [], note: 'No syllabus chapters defined for this month' }); return
  }

  const bySubject: Record<string, typeof syllabusThisMonth> = {}
  for (const sc of syllabusThisMonth) {
    if (!bySubject[sc.subject]) bySubject[sc.subject] = []
    bySubject[sc.subject].push(sc)
  }

  const behind = []
  for (const batch of batches) {
    const batchBehind: { subject: string; planned: number; completed: number; behind: number }[] = []

    for (const subj of SUBJECTS) {
      const planned = bySubject[subj]?.length ?? 0
      if (planned === 0) continue

      const syllabusIds = bySubject[subj].map((s) => s._id)
      const completedCount = await BatchChapter.countDocuments({
        batchId:           batch._id,
        syllabusChapterId: { $in: syllabusIds },
        facultyClassDone:  true,
      })

      if (completedCount < planned) {
        batchBehind.push({ subject: subj, planned, completed: completedCount, behind: planned - completedCount })
      }
    }

    if (batchBehind.length > 0) {
      behind.push({ batchId: batch._id, batchName: batch.name, batchType: batch.type, subjects: batchBehind })
    }
  }

  res.json({
    month:     queryMonth,
    monthName: MONTH_NAMES[queryMonth],
    batches:   behind,
    note:      'Only chapters linked to the syllabus via syllabusChapterId are counted.',
  })
})
