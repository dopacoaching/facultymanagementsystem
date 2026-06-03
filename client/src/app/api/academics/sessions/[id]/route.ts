import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'

/** PATCH /api/academics/sessions/:id — full edit (manager only) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid sessionId' }, 400), refreshedToken)
    }

    const body = await req.json() as Record<string, unknown>
    const allowed = ['facultyId', 'batchId', 'subject', 'chapter', 'startTime', 'durationHours', 'sessionDate', 'timeSlot']
    const update: Record<string, unknown> = {}

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'sessionDate') {
          const d = new Date(body[key] as string)
          if (isNaN(d.getTime())) {
            return withToken(json({ error: 'Invalid sessionDate' }, 400), refreshedToken)
          }
          update[key] = d
        } else if (key === 'facultyId' || key === 'batchId') {
          try { update[key] = new Types.ObjectId(body[key] as string) } catch {
            return withToken(json({ error: `Invalid ${key}` }, 400), refreshedToken)
          }
        } else {
          update[key] = body[key]
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return withToken(json({ error: 'No valid fields provided for update' }, 400), refreshedToken)
    }

    await connectDB()

    const session = await Session.findByIdAndUpdate(oid, update, { new: true, runValidators: true })
      .populate('facultyId', 'name subject')
    if (!session) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)

    return withToken(json(session), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/sessions/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
