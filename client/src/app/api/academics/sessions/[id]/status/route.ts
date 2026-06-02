import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'

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

    return withToken(json(session), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/sessions/:id/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
