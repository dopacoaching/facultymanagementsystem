import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { ISBatchChapter } from '@server/models/ISBatchChapter'

/** GET /api/integrated-school/chapters?batchId=&subject=&status= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')
    const subject = searchParams.get('subject')
    const status  = searchParams.get('status')

    const filter: Record<string, unknown> = {}
    if (batchId) { try { filter.batchId = new Types.ObjectId(batchId) } catch {} }
    if (subject) { filter.subject = subject }
    if (status)  { filter.status  = status  }

    await connectDB()

    const chapters = await ISBatchChapter.find(filter).sort({ subject: 1, chapterOrder: 1 })
    return withToken(json(chapters), refreshedToken)
  } catch (err) {
    console.error('[GET /api/integrated-school/chapters]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
