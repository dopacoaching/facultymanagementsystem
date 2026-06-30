import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { ISBatchChapter } from '@/lib/models/ISBatchChapter'

/** GET /api/ig/chapters?batchId=&subject=&status= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')
    const subject = searchParams.get('subject')
    const status  = searchParams.get('status')

    const filter: Record<string, unknown> = {}
    if (batchId) {
      try { filter.batchId = new Types.ObjectId(batchId) } catch {
        return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
      }
    }
    if (subject) { filter.subject = subject }
    if (status)  { filter.status  = status  }

    await connectDB()

    const chapters = await ISBatchChapter.find(filter).sort({ subject: 1, chapterOrder: 1 })
    return withToken(json(chapters), refreshedToken)
  } catch (err) {
    console.error('[GET /api/ig/chapters]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
