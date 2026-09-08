import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@/lib/models/WeeklySchedule'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { SCHEDULING_ENABLED } from '@/lib/featureFlags'
import { igScheduleScopeDenied } from '@/lib/scheduleScope'

/** POST /api/academics/schedules/:id/publish
 * Publishes the schedule. Exam topics are managed independently via
 * PATCH /exam-topic and are not required before publishing.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    if (!SCHEDULING_ENABLED) return withToken(json({ error: 'Not found' }, 404), refreshedToken)

    const forbidden = authorize(payload, 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    await connectDB()

    const schedule = await WeeklySchedule.findById(id)
    if (!schedule) return withToken(json({ error: 'Schedule not found' }, 404), refreshedToken)

    if (await igScheduleScopeDenied(payload, schedule.batchId)) {
      return withToken(json({ error: 'Access denied: schedule is outside your IG scope' }, 403), refreshedToken)
    }

    if (schedule.isPublished) {
      return withToken(json({
        error: 'Schedule already published. Create a revised version to make changes.',
      }, 409), refreshedToken)
    }

    schedule.isPublished = true
    schedule.publishedAt = new Date()
    await schedule.save()

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SCHEDULE_PUBLISHED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'Schedule', targetId: id,
      description: `Schedule published for week of ${new Date(schedule.weekStartDate).toDateString()}`,
    }).catch(() => null)

    return withToken(json({ success: true, schedule }), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/schedules/:id/publish]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
