import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { BatchChapter } from '@server/models/BatchChapter'

/** GET /api/academics/chapters/summary?batchIds=id1,id2,... */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchIds = searchParams.get('batchIds')

    if (!batchIds || typeof batchIds !== 'string') {
      return withToken(json({ error: 'batchIds query param required (comma-separated ObjectIds)' }, 400), refreshedToken)
    }

    const ids: Types.ObjectId[] = []
    for (const raw of batchIds.split(',').map((s) => s.trim()).filter(Boolean)) {
      try { ids.push(new Types.ObjectId(raw)) } catch { /* skip invalid */ }
    }
    if (ids.length === 0) return withToken(json([]), refreshedToken)

    await connectDB()

    const rows = await BatchChapter.aggregate([
      { $match: { batchId: { $in: ids } } },
      {
        $group: {
          _id:              '$batchId',
          totalChapters:    { $sum: 1 },
          videoComplete:    { $sum: { $cond: ['$videoComplete', 1, 0] } },
          facultyClassDone: { $sum: { $cond: ['$facultyClassDone', 1, 0] } },
          pendingVideo:     { $sum: { $cond: [{ $and: ['$facultyClassDone', { $not: '$videoComplete' }] }, 1, 0] } },
        },
      },
      {
        $project: {
          batchId:          '$_id',
          totalChapters:    1,
          videoComplete:    1,
          facultyClassDone: 1,
          pendingVideo:     1,
          _id:              0,
        },
      },
    ])

    return withToken(json(rows), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/chapters/summary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
