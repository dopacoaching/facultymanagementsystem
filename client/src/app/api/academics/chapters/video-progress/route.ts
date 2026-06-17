import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { SyllabusChapter } from '@/lib/models/SyllabusChapter'
import { writeAuditLog } from '@/lib/services/salary/audit'

/**
 * POST /api/academics/chapters/video-progress
 *
 * Class teacher (COORDINATOR) reports how many videos students have watched
 * for a chapter. Creates the BatchChapter record if it doesn't exist yet
 * (before any session has been logged).
 *
 * Body: { batchId, syllabusChapterId, videosWatched }
 *
 * videoComplete is auto-set when videosWatched >= totalVideos.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { batchId, syllabusChapterId, videosWatched } = await req.json()

    if (!batchId || !syllabusChapterId || videosWatched === undefined || videosWatched === null) {
      return withToken(json({ error: 'batchId, syllabusChapterId, and videosWatched are required' }, 400), refreshedToken)
    }

    const watched = Number(videosWatched)
    if (isNaN(watched) || watched < 0 || !Number.isInteger(watched)) {
      return withToken(json({ error: 'videosWatched must be a non-negative integer' }, 400), refreshedToken)
    }

    let batchOid: Types.ObjectId, syllabusOid: Types.ObjectId
    try { batchOid = new Types.ObjectId(batchId) } catch {
      return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
    }
    try { syllabusOid = new Types.ObjectId(syllabusChapterId) } catch {
      return withToken(json({ error: 'Invalid syllabusChapterId' }, 400), refreshedToken)
    }

    await connectDB()

    const syllabus = await SyllabusChapter.findById(syllabusOid).lean()
    if (!syllabus) return withToken(json({ error: 'Syllabus chapter not found' }, 404), refreshedToken)

    const clampedWatched  = Math.min(watched, syllabus.totalVideos > 0 ? syllabus.totalVideos : watched)
    const nowComplete     = syllabus.totalVideos > 0 && clampedWatched >= syllabus.totalVideos
    const now             = new Date()

    const setFields: Record<string, unknown> = {
      videosWatched:    clampedWatched,
      videoComplete:    nowComplete,
      totalVideos:      syllabus.totalVideos,
      scheduledMonth:   syllabus.scheduledMonth,
      syllabusChapterId: syllabusOid,
    }
    if (nowComplete) setFields.videoCompletedAt = now

    const chapter = await BatchChapter.findOneAndUpdate(
      { batchId: batchOid, syllabusChapterId: syllabusOid },
      {
        $set: setFields,
        $setOnInsert: {
          subject:      syllabus.subject,
          chapterName:  syllabus.chapterName,
          chapterOrder: syllabus.chapterOrder,
          facultyClassDone: false,
        },
      },
      { upsert: true, new: true }
    )

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'CHAPTER_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'Chapter', targetId: chapter._id.toString(),
      targetName: syllabus.chapterName,
      description: `Videos watched updated: ${clampedWatched}/${syllabus.totalVideos} for "${syllabus.chapterName}" (${syllabus.subject})${nowComplete ? ' — video complete' : ''}`,
      metadata: { batchId, syllabusChapterId, videosWatched: clampedWatched, totalVideos: syllabus.totalVideos, videoComplete: nowComplete },
    }).catch(() => null)

    return withToken(json(chapter), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/chapters/video-progress]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
