import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { ISTimetableSlot } from '@server/models/ISTimetableSlot'
import { SpecialDay } from '@server/models/SpecialDay'
import { getBatchTimings, applyExamDayTimings } from '@server/services/integratedSchool/timings'

function midnight(d: string | Date): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

/** GET /api/integrated-school/timetable/daily?date=&campusId= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const date     = searchParams.get('date')
    const campusId = searchParams.get('campusId')

    if (!date) return withToken(json({ error: 'date required' }, 400), refreshedToken)

    const dayStart = midnight(date)
    const dayEnd   = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999)

    const filter: Record<string, unknown> = { date: { $gte: dayStart, $lte: dayEnd } }
    if (campusId) {
      try { filter.campusId = new Types.ObjectId(campusId) } catch {}
    }

    await connectDB()

    const [slots, specialDays] = await Promise.all([
      ISTimetableSlot.find(filter)
        .populate('batchId',   'name type ig1Subgroup campusId')
        .populate('facultyId', 'name subject')
        .populate('campusId',  'name location')
        .sort({ timeSlot: 1, 'batchId.name': 1 }),
      SpecialDay.find({
        date: { $gte: dayStart, $lte: dayEnd },
        $or: campusId
          ? [{ campusId: new Types.ObjectId(campusId) }, { campusId: { $exists: false } }, { campusId: null }]
          : [{}],
      }).populate('campusId', 'name'),
    ])

    // Attach resolved timings to each slot
    const dayOfWeek = dayStart.getDay()
    const weekday   = dayOfWeek === 1 ? 'MONDAY' : dayOfWeek === 5 ? 'FRIDAY' : null

    const slotsWithTimings = slots.map((slot) => {
      const batch   = slot.batchId as unknown as { ig1Subgroup?: string }
      const base    = getBatchTimings(batch?.ig1Subgroup)
      const timings = weekday ? applyExamDayTimings(weekday, base) : base
      return { ...slot.toObject(), timings }
    })

    return withToken(json({ slots: slotsWithTimings, specialDays, date: dayStart }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/integrated-school/timetable/daily]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
