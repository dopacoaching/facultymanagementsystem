import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@server/models/WeeklySchedule'

/** POST /api/academics/schedules/:id/publish */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params

    await connectDB()

    const schedule = await WeeklySchedule.findById(id)
    if (!schedule) return withToken(json({ error: 'Schedule not found' }, 404), refreshedToken)

    if (schedule.isPublished) {
      return withToken(json({
        error: 'Schedule already published. Create a revised version to make changes.',
      }, 409), refreshedToken)
    }

    // HARD GATE: both exam topics must be non-empty
    const missing: string[] = []
    if (!schedule.mondayExamTopic?.trim()) missing.push('Monday')
    if (!schedule.fridayExamTopic?.trim()) missing.push('Friday')
    if (missing.length > 0) {
      return withToken(json({
        error:         `Cannot publish — exam topics missing for: ${missing.join(', ')}`,
        blocked:       true,
        missingTopics: missing,
      }, 422), refreshedToken)
    }

    schedule.isPublished = true
    schedule.publishedAt = new Date()
    await schedule.save()

    return withToken(json({ success: true, schedule }), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/schedules/:id/publish]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
