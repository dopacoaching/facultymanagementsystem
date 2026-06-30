import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'
import { Batch } from '@/lib/models/Batch'
import { isVideoFirstBatch } from '@/lib/utils/batchUtils'

/**
 * GET /api/academics/chapters?batchId=&subject=
 *
 * For RESIDENTIAL / ONLINE batches: returns the full SyllabusChapter list merged
 * with any existing BatchChapter progress for that batch, so teachers can mark
 * video progress even before any session has been logged.
 *
 * For other batch types: returns BatchChapter records only (existing behaviour).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')
    const subject = searchParams.get('subject')

    await connectDB()

    // For video-first batches, merge syllabus with batch progress
    if (batchId) {
      let batchOid: Types.ObjectId
      try { batchOid = new Types.ObjectId(batchId) } catch {
        return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
      }

      const batch = await Batch.findById(batchOid).lean()
      if (!batch) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)

      if (isVideoFirstBatch(batch.type)) {
        // Fetch full syllabus + existing batch progress in parallel
        const syllabusQuery = subject
          ? SyllabusChapter.find({ subject }).sort({ scheduledMonth: 1, chapterOrder: 1 }).lean()
          : SyllabusChapter.find({}).sort({ scheduledMonth: 1, chapterOrder: 1 }).lean()

        const [syllabus, batchChapters] = await Promise.all([
          syllabusQuery,
          BatchChapter.find({ batchId: batchOid }).lean(),
        ])

        // Index existing BatchChapters by syllabusChapterId for O(1) lookup
        const byScId = new Map(
          batchChapters
            .filter((bc) => bc.syllabusChapterId)
            .map((bc) => [bc.syllabusChapterId!.toString(), bc])
        )

        // Merge: every syllabus entry gets batch progress overlaid (or defaults)
        const merged = syllabus.map((sc) => {
          const bc = byScId.get(sc._id.toString())
          return {
            // Use BatchChapter._id if it exists so the PATCH endpoint works by ID;
            // fall back to a prefixed syllabus ID so the UI can still key the row.
            _id:               bc?._id?.toString() ?? `stub_${sc._id}`,
            syllabusChapterId: sc._id.toString(),
            batchId,
            subject:           sc.subject,
            chapterName:       sc.chapterName,
            chapterOrder:      sc.chapterOrder,
            scheduledMonth:    sc.scheduledMonth,
            totalVideos:       sc.totalVideos,
            videoReshooting:   sc.videoReshooting,
            // Progress — from BatchChapter if exists, otherwise zeroed defaults
            videosWatched:     bc?.videosWatched  ?? 0,
            videoComplete:     bc?.videoComplete  ?? false,
            videoCompletedAt:  bc?.videoCompletedAt ?? null,
            facultyClassDone:  bc?.facultyClassDone ?? false,
            facultyClassDoneAt: bc?.facultyClassDoneAt ?? null,
            isStub:            !bc,
          }
        })

        // Also append any BatchChapters that have no syllabusChapterId link
        // (chapters logged before the syllabus was seeded)
        const unlinked = batchChapters.filter((bc) => !bc.syllabusChapterId)
        const unlinkedRows = unlinked
          .filter((bc) => !subject || bc.subject === subject)
          .map((bc) => ({
            _id:               bc._id.toString(),
            syllabusChapterId: null,
            batchId,
            subject:           bc.subject,
            chapterName:       bc.chapterName,
            chapterOrder:      bc.chapterOrder,
            scheduledMonth:    bc.scheduledMonth ?? null,
            totalVideos:       bc.totalVideos    ?? null,
            videoReshooting:   false,
            videosWatched:     bc.videosWatched  ?? 0,
            videoComplete:     bc.videoComplete,
            videoCompletedAt:  bc.videoCompletedAt ?? null,
            facultyClassDone:  bc.facultyClassDone,
            facultyClassDoneAt: bc.facultyClassDoneAt ?? null,
            isStub:            false,
          }))

        return withToken(json([...merged, ...unlinkedRows]), refreshedToken)
      }
    }

    // Non-video-first batches (OFFLINE) or no batchId — original behaviour
    const filter: Record<string, unknown> = {}
    if (batchId) {
      try { filter.batchId = new Types.ObjectId(batchId) } catch {
        return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
      }
    }
    if (subject) filter.subject = subject

    const chapters = await BatchChapter.find(filter).sort({ subject: 1, chapterOrder: 1 })
    return withToken(json(chapters), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/chapters]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
