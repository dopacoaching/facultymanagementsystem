import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { ISTimetableSlot } from '@/lib/models/ISTimetableSlot'
import { SpecialDay } from '@/lib/models/SpecialDay'
import { getBatchTimings, applyExamDayTimings } from '@/lib/services/integratedSchool/timings'

/** GET /api/integrated-school/timetable/weekly?weekStart=&batchId=&campusId=&facultyId= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const weekStart = searchParams.get('weekStart')
    const batchId   = searchParams.get('batchId')
    const campusId  = searchParams.get('campusId')
    const facultyId = searchParams.get('facultyId')

    if (!weekStart) return withToken(json({ error: 'weekStart required' }, 400), refreshedToken)

    // Find Monday of the week containing weekStart
    const ref = new Date(weekStart); ref.setHours(0, 0, 0, 0)
    const dow  = ref.getDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const monday = new Date(ref); monday.setDate(ref.getDate() + mondayOffset)
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999)

    const filter: Record<string, unknown> = { date: { $gte: monday, $lte: sunday } }
    if (batchId)   { try { filter.batchId   = new Types.ObjectId(batchId)   } catch {} }
    if (campusId)  { try { filter.campusId  = new Types.ObjectId(campusId)  } catch {} }
    if (facultyId) { try { filter.facultyId = new Types.ObjectId(facultyId) } catch {} }

    await connectDB()

    const [slots, specialDays] = await Promise.all([
      ISTimetableSlot.find(filter)
        .populate('batchId',   'name type ig1Subgroup campusId')
        .populate('facultyId', 'name subject')
        .populate('campusId',  'name location')
        .sort({ date: 1, timeSlot: 1 }),
      SpecialDay.find({
        date: { $gte: monday, $lte: sunday },
      }).populate('campusId', 'name'),
    ])

    // Attach resolved timings per slot
    const slotsWithTimings = slots.map((slot) => {
      const dow     = new Date(slot.date).getDay()
      const weekday = dow === 1 ? 'MONDAY' : dow === 5 ? 'FRIDAY' : null
      const batch   = slot.batchId as unknown as { ig1Subgroup?: string }
      const base    = getBatchTimings(batch?.ig1Subgroup)
      const timings = weekday ? applyExamDayTimings(weekday, base) : base
      return { ...slot.toObject(), timings }
    })

    return withToken(json({ slots: slotsWithTimings, specialDays, weekStart: monday, weekEnd: sunday }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/integrated-school/timetable/weekly]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
