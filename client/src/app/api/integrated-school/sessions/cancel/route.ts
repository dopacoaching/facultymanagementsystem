import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@server/models/Session'
import { PermanentFacultyContract } from '@server/models/PermanentFacultyContract'
import { writeAuditLog } from '@server/services/salary/audit'

function isCoordinator(role: string): boolean {
  return role === 'COORDINATOR' || role === 'IS_COORDINATOR'
}

/** POST /api/integrated-school/sessions/cancel */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IS_COORDINATOR', 'IS_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { sessionId, cancellationInitiator, cancellationReason } = await req.json()

    const VALID_INITIATORS = ['FACULTY', 'MANAGEMENT', 'STUDENT']
    if (!cancellationInitiator || !VALID_INITIATORS.includes(cancellationInitiator)) {
      return withToken(json({ error: 'cancellationInitiator must be FACULTY, MANAGEMENT, or STUDENT' }, 400), refreshedToken)
    }
    if (!sessionId) {
      return withToken(json({ error: 'sessionId required' }, 400), refreshedToken)
    }

    await connectDB()

    // Coordinators may only cancel sessions for their assigned batch
    if (isCoordinator(payload.role)) {
      const targetSession = await Session.findById(sessionId).lean()
      if (!targetSession) return withToken(json({ error: 'Session not found' }, 404), refreshedToken)
      if (!payload.batchId || targetSession.batchId.toString() !== payload.batchId) {
        return withToken(json({ error: 'You can only cancel sessions for your assigned batch.' }, 403), refreshedToken)
      }
    }

    const effectiveInitiator = cancellationInitiator === 'STUDENT' ? 'MANAGEMENT' : cancellationInitiator as 'FACULTY' | 'MANAGEMENT'

    const session = await Session.findOneAndUpdate(
      { _id: sessionId, status: { $ne: 'CANCELLED' } },
      {
        status:                'CANCELLED',
        cancellationInitiator: effectiveInitiator,
        cancellationReason:    cancellationReason || `Cancelled by ${cancellationInitiator.toLowerCase()}`,
      },
      { new: true }
    ).populate('facultyId', 'name')

    if (!session) {
      const exists = await Session.exists({ _id: sessionId })
      return withToken(json({
        error: exists ? 'Session is already cancelled.' : 'Session not found',
      }, exists ? 409 : 404), refreshedToken)
    }

    const populatedFaculty = session.facultyId as unknown as { _id: Types.ObjectId; name: string }
    const facultyOid  = (populatedFaculty?._id ?? session.facultyId) as Types.ObjectId
    const facultyName = populatedFaculty?.name ?? 'Unknown'

    if (effectiveInitiator === 'FACULTY') {
      const contract = await PermanentFacultyContract.findOne({ facultyId: facultyOid })
      const penaltyAmount = contract?.cancellationPenaltyPerClass ?? 0

      await writeAuditLog({
        eventType:   'PENALTY_APPLIED',
        facultyId:   facultyOid.toString(),
        facultyName,
        amount:      penaltyAmount,
        reason:      `Class cancelled by faculty on ${session.sessionDate.toDateString()}` +
          (penaltyAmount > 0 ? ` — penalty ₹${penaltyAmount.toLocaleString('en-IN')}` : ' — no penalty contract'),
        cancellationInitiator: 'FACULTY',
        sessionId:   session._id.toString(),
        loggedByUserId: payload.userId,
      })
    } else {
      const initiatorLabel = cancellationInitiator === 'STUDENT' ? 'student' : 'management'
      await writeAuditLog({
        eventType:   'SESSION_CANCELLED',
        facultyId:   facultyOid.toString(),
        facultyName,
        amount:      0,
        reason:      `Session on ${session.sessionDate.toDateString()} cancelled by ${initiatorLabel}` +
          (cancellationReason ? ` — ${cancellationReason}` : ''),
        cancellationInitiator: effectiveInitiator,
        sessionId:   session._id.toString(),
        loggedByUserId: payload.userId,
      })
    }

    return withToken(json({ success: true, session }), refreshedToken)
  } catch (err) {
    console.error('[POST /api/integrated-school/sessions/cancel]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
