import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { Batch } from '@/lib/models/Batch'

const SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BOTANY', 'ZOOLOGY']
const MONTH_NAMES: Record<number, string> = {
  6: 'June', 7: 'July', 8: 'August', 9: 'September',
  10: 'October', 11: 'November', 12: 'December',
}

/** GET /api/academics/syllabus/behind?month=N */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const queryMonth = searchParams.get('month') ? Number(searchParams.get('month')) : new Date().getMonth() + 1

    if (isNaN(queryMonth) || queryMonth < 6 || queryMonth > 12) {
      return withToken(json({ error: 'month must be between 6 and 12' }, 400), refreshedToken)
    }

    await connectDB()

    const [batches, syllabusThisMonth] = await Promise.all([
      Batch.find({ type: { $in: ['RESIDENTIAL', 'OFFLINE', 'ONLINE'] }, isActive: true }),
      SyllabusChapter.find({ scheduledMonth: queryMonth }),
    ])

    if (syllabusThisMonth.length === 0) {
      return withToken(json({ month: queryMonth, batches: [], note: 'No syllabus chapters for this month' }), refreshedToken)
    }

    const bySubject: Record<string, typeof syllabusThisMonth> = {}
    for (const sc of syllabusThisMonth) {
      if (!bySubject[sc.subject]) bySubject[sc.subject] = []
      bySubject[sc.subject].push(sc)
    }

    const behind = []
    for (const batch of batches) {
      const batchBehind = []
      for (const subj of SUBJECTS) {
        const planned = bySubject[subj]?.length ?? 0
        if (planned === 0) continue
        const syllabusIds = bySubject[subj].map((s) => s._id)
        const completedCount = await BatchChapter.countDocuments({
          batchId: batch._id,
          syllabusChapterId: { $in: syllabusIds },
          facultyClassDone: true,
        })
        if (completedCount < planned) {
          batchBehind.push({ subject: subj, planned, completed: completedCount, behind: planned - completedCount })
        }
      }
      if (batchBehind.length > 0) {
        behind.push({ batchId: batch._id, batchName: batch.name, batchType: batch.type, subjects: batchBehind })
      }
    }

    return withToken(json({
      month: queryMonth,
      monthName: MONTH_NAMES[queryMonth],
      batches: behind,
      note: 'Only chapters linked via syllabusChapterId are counted.',
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/syllabus/behind]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
