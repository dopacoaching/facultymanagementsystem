import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { ChapterOption } from '@/lib/models/ChapterOption'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** DELETE /api/hr/setup/chapters/:id — remove a chapter from the list. Past entries keep their chapter text. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    if (!Types.ObjectId.isValid(id)) return withToken(json({ error: 'Invalid chapter id' }, 400), refreshedToken)

    await connectDB()
    const removed = await ChapterOption.findByIdAndDelete(id)
    if (!removed) return withToken(json({ error: 'Chapter not found' }, 404), refreshedToken)

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'CHAPTER_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'ChapterOption', targetId: id, targetName: removed.subject,
      description: `Chapter removed from ${removed.subject}: ${removed.name}`,
      metadata: { subject: removed.subject, removed: removed.name },
    }).catch(() => null)

    return withToken(json({ ok: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/hr/setup/chapters/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
