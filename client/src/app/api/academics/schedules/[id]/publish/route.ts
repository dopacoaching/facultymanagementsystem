import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@/lib/models/WeeklySchedule'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** POST /api/academics/schedules/:id/publish
 * Publishes the schedule. Exam topics are managed independently via
 * PATCH /exam-topic and are not required before publishing.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    await connectDB()

    const schedule = await WeeklySchedule.findById(id)
    if (!schedule) return withToken(json({ error: 'Schedule not found' }, 404), refreshedToken)

    if (schedule.isPublished) {
      return withToken(json({
        error: 'Schedule already published. Create a revised version to make changes.',
      }, 409), refreshedToken)
    }

    schedule.isPublished = true
    schedule.publishedAt = new Date()
    try { await schedule.save() } catch (e: unknown) {
      return withToken(json({ error: 'debug', detail: e instanceof Error ? e.message : String(e) }, 500), refreshedToken)
    }

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SCHEDULE_PUBLISHED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'Schedule', targetId: id,
      description: `Schedule published for week of ${new Date(schedule.weekStartDate).toDateString()}`,
    }).catch(() => null)

    return withToken(json({ success: true, schedule }), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/schedules/:id/publish]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
