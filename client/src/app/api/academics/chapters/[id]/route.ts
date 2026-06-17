import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { BatchChapter } from '@/lib/models/BatchChapter'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** PATCH /api/academics/chapters/:id — update chapter completion flags */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    const { videoComplete, facultyClassDone, sessionId, videosWatched } = await req.json()
    const now = new Date()
    const setFields:   Record<string, unknown> = {}
    const unsetFields: Record<string, unknown> = {}

    // videosWatched: direct count update (auto-derives videoComplete from totalVideos)
    if (videosWatched !== undefined) {
      const chapter = await BatchChapter.findById((await params).id).lean()
      if (chapter) {
        const watched  = Math.max(0, Number(videosWatched))
        const complete = typeof chapter.totalVideos === 'number' && chapter.totalVideos > 0
          ? watched >= chapter.totalVideos
          : Boolean(videoComplete ?? chapter.videoComplete)
        setFields.videosWatched    = watched
        setFields.videoComplete    = complete
        setFields.videoCompletedAt = complete ? now : null
      }
    } else if (videoComplete !== undefined) {
      setFields.videoComplete    = Boolean(videoComplete)
      setFields.videoCompletedAt = videoComplete ? now : null
    }
    if (facultyClassDone !== undefined) {
      setFields.facultyClassDone = Boolean(facultyClassDone)
      if (Boolean(facultyClassDone)) {
        setFields.facultyClassDoneAt = now
        if (sessionId) setFields.sessionId = sessionId
      } else {
        // Use $unset so sessionId is fully absent (null satisfies $exists:true, breaking cancel reset queries).
        unsetFields.facultyClassDoneAt = ''
        unsetFields.sessionId = ''
      }
    }

    if (Object.keys(setFields).length === 0 && Object.keys(unsetFields).length === 0) {
      return withToken(json({ error: 'Provide videoComplete and/or facultyClassDone' }, 400), refreshedToken)
    }

    const mongoUpdate: Record<string, unknown> = {}
    if (Object.keys(setFields).length)   mongoUpdate.$set   = setFields
    if (Object.keys(unsetFields).length) mongoUpdate.$unset = unsetFields

    await connectDB()

    const chapter = await BatchChapter.findByIdAndUpdate(id, mongoUpdate, { new: true })
    if (!chapter) return withToken(json({ error: 'Chapter not found' }, 404), refreshedToken)

    const changeDesc = videoComplete !== undefined
      ? `Video marked ${Boolean(videoComplete) ? 'complete' : 'incomplete'}`
      : `Class marked ${Boolean(facultyClassDone) ? 'done' : 'not done'}`
    writeAuditLog({
      category: 'ACADEMICS', eventType: 'CHAPTER_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'Chapter', targetId: id,
      targetName: chapter.chapterName,
      description: `${changeDesc}: "${chapter.chapterName}" (${chapter.subject})`,
      metadata: { subject: chapter.subject, videoComplete, facultyClassDone },
    }).catch(() => null)

    return withToken(json(chapter), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/chapters/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
