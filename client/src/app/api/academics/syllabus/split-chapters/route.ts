import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'
import { BatchChapter } from '@/lib/models/BatchChapter'

/** GET /api/academics/syllabus/split-chapters?batchId= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')

    let batchOid: Types.ObjectId | undefined
    if (batchId) {
      try { batchOid = new Types.ObjectId(batchId) } catch {
        return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
      }
    }

    await connectDB()

    const [splitPart1s, splitPart2s] = await Promise.all([
      SyllabusChapter.find({ isSplitPart: true, splitPartNumber: 1 }).sort({ subject: 1, scheduledMonth: 1 }),
      SyllabusChapter.find({ isSplitPart: true, splitPartNumber: 2 }),
    ])

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
          part1Done:     bc1?.facultyClassDone  ?? false,
          part1DoneAt:   bc1?.facultyClassDoneAt ?? null,
          part2Done:     bc2?.facultyClassDone  ?? false,
          part2DoneAt:   bc2?.facultyClassDoneAt ?? null,
          part2Unlocked: bc1?.facultyClassDone  ?? false,
        }
      }
      result.push(pair)
    }

    return withToken(json(result), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/syllabus/split-chapters]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
