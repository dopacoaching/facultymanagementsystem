import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { FacultyAvailability } from '@/lib/models/FacultyAvailability'
import { Faculty } from '@/lib/models/Faculty'
import { dayRangeFilter } from '@/lib/utils/dateRange'

const ALLOWED_ROLES = ['ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'] as const

/** GET /api/academics/availability?facultyId=X&from=&to= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, ...ALLOWED_ROLES)
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const facultyId = searchParams.get('facultyId') ?? ''
    const from      = searchParams.get('from') ?? ''
    const to        = searchParams.get('to') ?? ''

    if (!facultyId || !from || !to) {
      return withToken(json({ error: 'facultyId, from, to required' }, 400), refreshedToken)
    }

    let fid: Types.ObjectId
    try { fid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    const range = dayRangeFilter(from, to)
    if (!range) {
      return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
    }

    await connectDB()

    const entries = await FacultyAvailability.find({
      facultyId: fid,
      date: range,
    }).sort({ date: 1 })

    return withToken(json(entries), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/availability]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/academics/availability — bulk upsert available dates */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, ...ALLOWED_ROLES)
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { facultyId, dates } = await req.json() as { facultyId?: string; dates?: string[] }

    if (!facultyId || !dates || !Array.isArray(dates) || dates.length === 0) {
      return withToken(json({ error: 'facultyId and dates[] required' }, 400), refreshedToken)
    }

    let fid: Types.ObjectId
    try { fid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    const faculty = await Faculty.findById(fid)
    if (!faculty) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)

    const userId = new Types.ObjectId(payload.userId)

    const ops = dates.map((dateStr) => ({
      updateOne: {
        filter: { facultyId: fid, date: new Date(dateStr) },
        update: {
          $setOnInsert: {
            facultyId: fid,
            date: new Date(dateStr),
            status: 'AVAILABLE' as const,
            loggedByUserId: userId,
          },
        },
        upsert: true,
      },
    }))

    await FacultyAvailability.bulkWrite(ops)

    // Return entries for the month of the first submitted date
    const anchor    = new Date(dates[0])
    const startDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const endDate   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)

    const entries = await FacultyAvailability.find({
      facultyId: fid,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: 1 })

    return withToken(json(entries, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/academics/availability]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
