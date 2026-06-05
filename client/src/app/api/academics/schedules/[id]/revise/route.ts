import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@/lib/models/WeeklySchedule'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** POST /api/academics/schedules/:id/revise */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params

    await connectDB()

    const original = await WeeklySchedule.findById(id)
    if (!original) return withToken(json({ error: 'Schedule not found' }, 404), refreshedToken)

    if (!original.isPublished) {
      return withToken(json({
        error: 'Only published schedules can be revised. Edit the draft directly instead.',
      }, 400), refreshedToken)
    }

    // Check no revision already exists for this week / batch
    const existing = await WeeklySchedule.findOne({
      batchId:        original.batchId,
      weekStartDate:  original.weekStartDate,
      isRevised:      true,
      isPublished:    false,
    })
    if (existing) {
      return withToken(json({
        error:      'An unpublished revision already exists for this week.',
        revisionId: existing._id,
      }, 409), refreshedToken)
    }

    const revision = await WeeklySchedule.create({
      batchId:            original.batchId,
      weekStartDate:      original.weekStartDate,
      weekEndDate:        original.weekEndDate,
      mondayExamTopic:    original.mondayExamTopic,
      fridayExamTopic:    original.fridayExamTopic,
      classEntries:       original.classEntries,
      isRevised:          true,
      replacesScheduleId: original._id,
    })

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'SCHEDULE_REVISED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'Schedule', targetId: id,
      description: `Revision draft created for week of ${new Date(original.weekStartDate).toDateString()}`,
      metadata: { revisionId: revision._id.toString() },
    }).catch(() => null)

    return withToken(json({ success: true, revision }, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/schedules/:id/revise]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
