import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@/lib/models/WeeklySchedule'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { SCHEDULING_ENABLED } from '@/lib/featureFlags'
import { igScheduleScopeDenied, academicsManagerScopeDenied } from '@/lib/scheduleScope'

/** POST /api/academics/schedules/:id/revise */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    if (!SCHEDULING_ENABLED) return withToken(json({ error: 'Not found' }, 404), refreshedToken)

    const forbidden = authorize(payload, 'ADMIN', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    await connectDB()

    const original = await WeeklySchedule.findById(id)
    if (!original) return withToken(json({ error: 'Schedule not found' }, 404), refreshedToken)

    if (await igScheduleScopeDenied(payload, original.batchId)) {
      return withToken(json({ error: 'Access denied: schedule is outside your IG scope' }, 403), refreshedToken)
    }
    if (await academicsManagerScopeDenied(payload, original.batchId)) {
      return withToken(json({ error: 'Access denied: batch is outside your assigned batch type' }, 403), refreshedToken)
    }

    if (!original.isPublished) {
      return withToken(json({
        error: 'Only published schedules can be revised. Edit the draft directly instead.',
      }, 400), refreshedToken)
    }

    // Return an existing unpublished revision draft if one already exists for this week/batch
    const existing = await WeeklySchedule.findOne({
      batchId:        original.batchId,
      weekStartDate:  original.weekStartDate,
      isRevised:      true,
      isPublished:    false,
    }).populate('classEntries.facultyId', 'name subject')
    if (existing) {
      return withToken(json({ success: true, revision: existing }), refreshedToken)
    }

    // Block if a published revision already exists — can't have two active published schedules
    const publishedRevision = await WeeklySchedule.findOne({
      batchId:        original.batchId,
      weekStartDate:  original.weekStartDate,
      isRevised:      true,
      isPublished:    true,
    })
    if (publishedRevision) {
      return withToken(json({
        error:      'A published revision already exists for this week. Revise the revision instead.',
        scheduleId: publishedRevision._id,
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
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
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
