import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { Batch } from '@server/models/Batch'
import { BatchChapter } from '@server/models/BatchChapter'
import { isVideoFirstBatch } from '@server/utils/batchUtils'

function midnight(d: Date | string): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

/** GET /api/academics/exams/suggest?batchId=&examDate=&weekStartDate= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchId       = searchParams.get('batchId')
    const examDate      = searchParams.get('examDate')
    const weekStartDate = searchParams.get('weekStartDate')

    if (!batchId)    return withToken(json({ error: 'batchId required' }, 400), refreshedToken)
    if (!examDate)   return withToken(json({ error: 'examDate required' }, 400), refreshedToken)

    let batchOid: Types.ObjectId
    try { batchOid = new Types.ObjectId(batchId) } catch {
      return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
    }

    await connectDB()

    const batch = await Batch.findById(batchOid)
    if (!batch) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)

    const isOffline    = !isVideoFirstBatch(batch.type)
    const examDateObj  = midnight(examDate)
    const examDay      = examDateObj.getDay()

    // Auto-derive weekStartDate when the client doesn't send it
    let derivedWeekStart: Date | null = null
    if (weekStartDate) {
      derivedWeekStart = midnight(weekStartDate)
    } else if (examDay === 1) {
      derivedWeekStart = midnight(examDate)
      derivedWeekStart.setDate(derivedWeekStart.getDate() - 2)
    } else if (examDay === 5) {
      derivedWeekStart = midnight(examDate)
      derivedWeekStart.setDate(derivedWeekStart.getDate() - 6)
    }

    // GAP 4: Day-specific buffer cutoff
    let bufferCutoff: Date
    if (examDay === 1 && derivedWeekStart) {
      bufferCutoff = derivedWeekStart
    } else {
      bufferCutoff = midnight(examDate)
      bufferCutoff.setDate(bufferCutoff.getDate() - 1)
    }

    const eligibleFilter: Record<string, unknown> = {
      batchId:            batchOid,
      facultyClassDone:   true,
      facultyClassDoneAt: { $lt: bufferCutoff },
    }
    if (!isOffline) {
      eligibleFilter.videoComplete = true
    }

    const allEligible = await BatchChapter.find(eligibleFilter).sort({ facultyClassDoneAt: -1 })

    // GAP 5: Friday exam prefers this-week chapters
    let eligible  = allEligible
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
      }
    }

    // Find chapters excluded by the buffer
    const bufferFilter: Record<string, unknown> = {
      batchId:            batchOid,
      facultyClassDone:   true,
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
    const subjects  = Object.keys(bySubjectMap)
    const bySubject = subjects.map((s) => ({ subject: s, chapters: bySubjectMap[s] }))

    // Apply Cases 1–4
    type SuggestionCase = 1 | 2 | 3 | 4
    let topic: string
    let isPending: boolean
    let suggestedCase: SuggestionCase

    if (eligible.length === 0) {
      topic         = '[Topic Pending — Academics to confirm]'
      isPending     = true
      suggestedCase = 4
    } else if (subjects.length === 1 && bySubjectMap[subjects[0]].length >= 2) {
      const [ch1, ch2] = bySubjectMap[subjects[0]]
      topic         = `Exam: ${ch1} + ${ch2}`
      isPending     = false
      suggestedCase = 1
    } else if (subjects.length >= 2) {
      const ch1 = bySubjectMap[subjects[0]][0]
      const ch2 = bySubjectMap[subjects[1]][0]
      topic         = `Exam: ${ch1} + ${ch2}`
      isPending     = false
      suggestedCase = 2
    } else {
      topic         = `Exam: ${eligible[0].chapterName}`
      isPending     = false
      suggestedCase = 3
    }

    return withToken(json({
      suggestion: { topic, isPending, case: suggestedCase, excluded, usedFallback },
      bySubject,
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/exams/suggest]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
