import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { Batch } from '@/lib/models/Batch'

const SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BOTANY', 'ZOOLOGY'] as const
const MONTH_NAMES: Record<number, string> = {
  6: 'June', 7: 'July', 8: 'August', 9: 'September',
  10: 'October', 11: 'November', 12: 'December',
}

/** GET /api/academics/syllabus/progress/:batchId */
export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    let batchOid: Types.ObjectId
    try { batchOid = new Types.ObjectId(params.batchId) } catch {
      return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
    }

    await connectDB()

    const batch = await Batch.findById(batchOid)
    if (!batch) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)

    const [allSyllabus, batchChapters] = await Promise.all([
      SyllabusChapter.find().sort({ scheduledMonth: 1, subject: 1, chapterOrder: 1 }),
      BatchChapter.find({ batchId: batchOid, syllabusChapterId: { $exists: true } }),
    ])

    const bcMap = new Map(batchChapters.map((bc) => [bc.syllabusChapterId!.toString(), bc]))

    const progress: Record<string, Record<string, unknown>> = {}

    for (const subj of SUBJECTS) {
      progress[subj] = {}
      const subjChapters = allSyllabus.filter((c) => c.subject === subj)

      for (let month = 6; month <= 12; month++) {
        const monthChapters = subjChapters.filter((c) => c.scheduledMonth === month)
        if (monthChapters.length === 0) continue

        let completed = 0, onTime = 0, late = 0
        for (const sc of monthChapters) {
          const bc = bcMap.get(sc._id.toString())
          if (!bc?.facultyClassDone) continue
          completed++
          if (bc.facultyClassDoneAt) {
            const doneMonth = new Date(bc.facultyClassDoneAt).getMonth() + 1
            if (doneMonth >= 6 && doneMonth <= month) onTime++
            else late++
          }
        }

        const planned = monthChapters.length
        const behind  = planned - completed
        let status: string
        if (completed === 0)   status = 'NOT_STARTED'
        else if (behind === 0) status = 'ON_TRACK'
        else if (behind === 1) status = 'SLIGHTLY_BEHIND'
        else                   status = 'BEHIND'

        progress[subj][String(month)] = {
          monthName: MONTH_NAMES[month],
          chaptersPlanned: planned,
          chaptersCompleted: completed,
          chaptersOnTime: onTime,
          chaptersLate: late,
          status,
        }
      }

      const totalSubjChapters = subjChapters.length
      const linkedDoneCount   = subjChapters.filter((sc) => bcMap.get(sc._id.toString())?.facultyClassDone).length
      if (linkedDoneCount === totalSubjChapters && totalSubjChapters > 0) {
        for (const key of Object.keys(progress[subj])) {
          (progress[subj][key] as Record<string, unknown>).status = 'COMPLETED'
        }
      }
    }

    return withToken(json({ batchId: params.batchId, batchName: batch.name, progress }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/syllabus/progress]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
