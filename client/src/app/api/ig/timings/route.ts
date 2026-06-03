import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { Batch } from '@/lib/models/Batch'
import { SpecialDay } from '@/lib/models/SpecialDay'
import { getBatchTimings, applyExamDayTimings } from '@/lib/services/integratedSchool/timings'

function midnight(d: string | Date): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

/** GET /api/ig/timings?batchId=&date= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId')
    const date    = searchParams.get('date')

    if (!batchId || !date) {
      return withToken(json({ error: 'batchId and date required' }, 400), refreshedToken)
    }

    let batchOid: Types.ObjectId
    try { batchOid = new Types.ObjectId(batchId) } catch {
      return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
    }

    await connectDB()

    const batch = await Batch.findById(batchOid)
    if (!batch) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)

    const base    = getBatchTimings(batch.ig1Subgroup)
    const d       = new Date(date)
    const dow     = d.getDay()
    const weekday = dow === 1 ? 'MONDAY' : dow === 5 ? 'FRIDAY' : null
    const timings = weekday ? applyExamDayTimings(weekday, base) : base

    // Check for special day exam overrides
    const dayStart = midnight(date)
    const dayEnd   = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999)
    const specialDay = await SpecialDay.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
      $or:  [{ campusId: batch.campusId }, { campusId: { $exists: false } }, { campusId: null }],
      type: { $in: ['MONDAY_EXAM', 'FRIDAY_EXAM', 'WEEKLY_EXAM'] },
    })

    return withToken(json({
      batchId,
      date,
      ig1Subgroup: batch.ig1Subgroup ?? null,
      timings,
      specialDay:  specialDay ?? null,
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/ig/timings]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
