import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@/lib/models/WeeklySchedule'

/** PATCH /api/academics/schedules/:id/exam-topic */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    const { mondayExamTopic, fridayExamTopic } = await req.json()

    if (mondayExamTopic === undefined && fridayExamTopic === undefined) {
      return withToken(json({ error: 'Provide mondayExamTopic and/or fridayExamTopic' }, 400), refreshedToken)
    }

    await connectDB()

    const schedule = await WeeklySchedule.findById(id)
    if (!schedule) return withToken(json({ error: 'Schedule not found' }, 404), refreshedToken)

    if (schedule.isPublished) {
      return withToken(json({
        error: 'Cannot edit a published schedule. Create a revision instead.',
      }, 409), refreshedToken)
    }

    if (mondayExamTopic !== undefined) schedule.mondayExamTopic = mondayExamTopic
    if (fridayExamTopic !== undefined) schedule.fridayExamTopic = fridayExamTopic
    await schedule.save()

    return withToken(json(schedule), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/schedules/:id/exam-topic]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
