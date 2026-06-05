import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { ISBatchChapter } from '@/lib/models/ISBatchChapter'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** PATCH /api/ig/chapters/:id — manual status override */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IG_ACADEMICS_MANAGER', 'ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    const { status, chapterOrder, scheduledDate, completedDate } = await req.json()

    const update: Record<string, unknown> = {}

    const VALID_STATUS = ['NOT_YET_SCHEDULED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']
    if (status !== undefined) {
      if (!VALID_STATUS.includes(status)) {
        return withToken(json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` }, 400), refreshedToken)
      }
      update.status = status
    }
    if (chapterOrder  !== undefined) update.chapterOrder  = Number(chapterOrder)
    if (scheduledDate !== undefined) update.scheduledDate = scheduledDate ? new Date(scheduledDate) : null
    if (completedDate !== undefined) update.completedDate = completedDate ? new Date(completedDate) : null

    if (Object.keys(update).length === 0) {
      return withToken(json({ error: 'Nothing to update' }, 400), refreshedToken)
    }

    await connectDB()

    const chapter = await ISBatchChapter.findByIdAndUpdate(id, update, { new: true })
    if (!chapter) return withToken(json({ error: 'IS chapter not found' }, 404), refreshedToken)

    writeAuditLog({
      category: 'IG', eventType: 'IG_CHAPTER_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'Chapter', targetId: id,
      targetName: chapter.chapterName,
      description: `IG chapter updated: "${chapter.chapterName}" (${chapter.subject})${status ? ` → ${status}` : ''}`,
      metadata: { updated: Object.keys(update) },
    }).catch(() => null)

    return withToken(json(chapter), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/ig/chapters/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
