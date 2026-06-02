import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { WeeklySchedule } from '@/lib/models/WeeklySchedule'

function midnight(d: Date | string): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

/** GET /api/academics/schedules?batchId= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')

    const filter: Record<string, unknown> = {}
    if (batchId) {
      try { filter.batchId = new Types.ObjectId(batchId) } catch {}
    }

    await connectDB()

    const schedules = await WeeklySchedule.find(filter)
      .populate('batchId', 'name type')
      .populate('classEntries.facultyId', 'name subject')
      .sort({ weekStartDate: -1 })

    return withToken(json(schedules), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/schedules]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/academics/schedules — create or update a weekly schedule */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { batchId, weekStartDate, mondayExamTopic, fridayExamTopic, classEntries } = await req.json()

    if (!batchId || !weekStartDate) {
      return withToken(json({ error: 'batchId and weekStartDate required' }, 400), refreshedToken)
    }

    let batchOid: Types.ObjectId
    try { batchOid = new Types.ObjectId(batchId) } catch {
      return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
    }

    const startDate = midnight(weekStartDate)

    // Validate: weekStartDate must be a Saturday (getDay() === 6)
    if (startDate.getDay() !== 6) {
      return withToken(json({
        error: `weekStartDate must be a Saturday. Received: ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][startDate.getDay()]}`,
      }, 400), refreshedToken)
    }

    // End date = Saturday + 6 = Friday
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)

    const updateDoc: Record<string, unknown> = { weekEndDate: endDate }
    if (mondayExamTopic !== undefined) updateDoc.mondayExamTopic = mondayExamTopic
    if (fridayExamTopic !== undefined) updateDoc.fridayExamTopic = fridayExamTopic
    if (classEntries   !== undefined) updateDoc.classEntries    = classEntries

    await connectDB()

    const isNew = !(await WeeklySchedule.exists({ batchId: batchOid, weekStartDate: startDate, isRevised: false }))
    const schedule = await WeeklySchedule.findOneAndUpdate(
      { batchId: batchOid, weekStartDate: startDate, isRevised: false },
      updateDoc,
      { upsert: true, new: true }
    ).populate('classEntries.facultyId', 'name subject')

    return withToken(json(schedule, isNew ? 201 : 200), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/schedules]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
