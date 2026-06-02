import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { BatchChapter } from '@/lib/models/BatchChapter'

/** PATCH /api/academics/chapters/:id — update chapter completion flags */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'COORDINATOR', 'IS_COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params
    const { videoComplete, facultyClassDone, sessionId } = await req.json()
    const now    = new Date()
    const update: Record<string, unknown> = {}

    if (videoComplete !== undefined) {
      update.videoComplete    = Boolean(videoComplete)
      update.videoCompletedAt = videoComplete ? now : null
    }
    if (facultyClassDone !== undefined) {
      update.facultyClassDone   = Boolean(facultyClassDone)
      update.facultyClassDoneAt = facultyClassDone ? now : null
      update.sessionId          = facultyClassDone ? (sessionId ?? null) : null
    }

    if (Object.keys(update).length === 0) {
      return withToken(json({ error: 'Provide videoComplete and/or facultyClassDone' }, 400), refreshedToken)
    }

    await connectDB()

    const chapter = await BatchChapter.findByIdAndUpdate(id, update, { new: true })
    if (!chapter) return withToken(json({ error: 'Chapter not found' }, 404), refreshedToken)

    return withToken(json(chapter), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/chapters/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
