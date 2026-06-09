import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'

const SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'BOTANY', 'ZOOLOGY', 'MATHS', 'ENGLISH', 'MALAYALAM', 'ARABIC']

/** GET /api/academics/syllabus/chapters?subject=CHEMISTRY&month=8 */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const subject = searchParams.get('subject')
    const month   = searchParams.get('month')

    if (!subject) {
      return withToken(json({ error: 'subject query parameter is required' }, 400), refreshedToken)
    }
    const subjectUp = subject.toUpperCase()
    if (!SUBJECTS.includes(subjectUp)) {
      return withToken(json({ error: `subject must be one of: ${SUBJECTS.join(', ')}` }, 400), refreshedToken)
    }

    const filter: Record<string, unknown> = { subject: subjectUp }
    if (month) {
      const m = Number(month)
      if (isNaN(m) || m < 6 || m > 12) {
        return withToken(json({ error: 'month must be 6–12' }, 400), refreshedToken)
      }
      filter.scheduledMonth = m
    }

    await connectDB()
    const chapters = await SyllabusChapter.find(filter)
      .populate('parentChapterId', 'chapterName scheduledMonth')
      .sort({ globalOrder: 1 })

    return withToken(json(chapters), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/syllabus/chapters]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
