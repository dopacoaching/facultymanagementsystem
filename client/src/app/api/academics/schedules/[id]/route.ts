import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@/lib/models/WeeklySchedule'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { SCHEDULING_ENABLED } from '@/lib/featureFlags'
import { igScheduleScopeDenied, academicsManagerScopeDenied } from '@/lib/scheduleScope'

/** DELETE /api/academics/schedules/:id — discard an unpublished draft */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    if (!SCHEDULING_ENABLED) return withToken(json({ error: 'Not found' }, 404), refreshedToken)

    const forbidden = authorize(payload, 'ADMIN', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    await connectDB()

    const schedule = await WeeklySchedule.findById(id)
    if (!schedule) return withToken(json({ error: 'Schedule not found' }, 404), refreshedToken)

    if (await igScheduleScopeDenied(payload, schedule.batchId)) {
      return withToken(json({ error: 'Access denied: schedule is outside your IG scope' }, 403), refreshedToken)
    }
    if (await academicsManagerScopeDenied(payload, schedule.batchId)) {
      return withToken(json({ error: 'Access denied: batch is outside your assigned batch type' }, 403), refreshedToken)
    }

    if (schedule.isPublished) {
      return withToken(json({
        error: 'Published schedules cannot be deleted. Create a revision instead.',
      }, 409), refreshedToken)
    }

    const weekStr = new Date(schedule.weekStartDate).toDateString()
    await schedule.deleteOne()

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SCHEDULE_DELETED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Schedule', targetId: id,
      description: `Draft schedule deleted for week of ${weekStr}`,
    }).catch(() => null)

    return withToken(json({ success: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/academics/schedules/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
