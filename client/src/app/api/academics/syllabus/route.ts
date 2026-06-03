import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'

const MONTH_NAMES: Record<number, string> = {
  6: 'June', 7: 'July', 8: 'August', 9: 'September',
  10: 'October', 11: 'November', 12: 'December',
}

/** GET /api/academics/syllabus — full annual syllabus grouped by month → subject */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    await connectDB()

    const chapters = await SyllabusChapter.find().sort({ scheduledMonth: 1, subject: 1, chapterOrder: 1 })

    const grouped: Record<string, { monthName: string; subjects: Record<string, typeof chapters> }> = {}
    for (const ch of chapters) {
      const key = String(ch.scheduledMonth)
      if (!grouped[key]) grouped[key] = { monthName: MONTH_NAMES[ch.scheduledMonth], subjects: {} }
      if (!grouped[key].subjects[ch.subject]) grouped[key].subjects[ch.subject] = []
      grouped[key].subjects[ch.subject].push(ch)
    }

    return withToken(json(grouped), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/syllabus]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
