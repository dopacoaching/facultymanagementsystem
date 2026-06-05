import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@/lib/models/WeeklySchedule'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** DELETE /api/academics/schedules/:id — discard an unpublished draft */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    await connectDB()

    const schedule = await WeeklySchedule.findById(id)
    if (!schedule) return withToken(json({ error: 'Schedule not found' }, 404), refreshedToken)

    if (schedule.isPublished) {
      return withToken(json({
        error: 'Published schedules cannot be deleted. Create a revision instead.',
      }, 409), refreshedToken)
    }

    const weekStr = new Date(schedule.weekStartDate).toDateString()
    await schedule.deleteOne()

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SCHEDULE_DELETED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'Schedule', targetId: id,
      description: `Draft schedule deleted for week of ${weekStr}`,
    }).catch(() => null)

    return withToken(json({ success: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/academics/schedules/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
