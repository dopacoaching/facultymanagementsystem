import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { BatchChapter } from '@server/models/BatchChapter'

/** GET /api/academics/chapters?batchId=&subject= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')
    const subject = searchParams.get('subject')

    const filter: Record<string, unknown> = {}
    if (batchId) {
      try { filter.batchId = new Types.ObjectId(batchId) } catch {}
    }
    if (subject) filter.subject = subject

    await connectDB()

    const chapters = await BatchChapter.find(filter).sort({ subject: 1, chapterOrder: 1 })
    return withToken(json(chapters), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/chapters]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
