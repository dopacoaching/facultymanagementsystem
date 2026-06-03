import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { BatchChapter } from '@/lib/models/BatchChapter'

/** PATCH /api/academics/sessions/:id/status */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid sessionId' }, 400), refreshedToken)
    }

    const { status } = await req.json()
    const ALLOWED = ['SCHEDULED', 'COMPLETED', 'NOT_COMPLETED']

    if (!status || !ALLOWED.includes(status)) {
      return withToken(json({ error: `status must be one of: ${ALLOWED.join(', ')}` }, 400), refreshedToken)
    }

    await connectDB()

    // Coordinator batch ownership guard — must match assigned batch
    if (payload.role === 'COORDINATOR' || payload.role === 'IS_COORDINATOR') {
      const target = await Session.findById(oid).lean()
      if (!target) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)
      if (!payload.batchId || target.batchId.toString() !== payload.batchId) {
        return withToken(json({ error: 'You can only update sessions for your assigned batch.' }, 403), refreshedToken)
      }
    }

    const session = await Session.findOneAndUpdate(
      { _id: oid, status: { $ne: 'CANCELLED' } },
      { status },
      { new: true },
    )

    if (!session) {
      const exists = await Session.exists({ _id: oid })
      return withToken(json({
        error: exists ? 'Cannot change the status of a cancelled session.' : 'Session not found',
      }, exists ? 409 : 404), refreshedToken)
    }

    // When a class is marked NOT_COMPLETED the faculty didn't actually take it —
    // reset the chapter so it can be re-scheduled and re-logged.
    if (status === 'NOT_COMPLETED') {
      await BatchChapter.findOneAndUpdate(
        { batchId: session.batchId, subject: session.subject, chapterName: session.chapter, sessionId: session._id },
        { $set: { facultyClassDone: false }, $unset: { facultyClassDoneAt: '', sessionId: '' } },
      ).catch(() => null)
    }

    return withToken(json(session), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/sessions/:id/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
