import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { SpecialDay } from '@/lib/models/SpecialDay'

function midnight(d: string | Date): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

/** GET /api/integrated-school/special-days?from=&to=&campusId= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    const from     = searchParams.get('from')
    const to       = searchParams.get('to')
    const campusId = searchParams.get('campusId')

    const filter: Record<string, unknown> = {}

    if (from || to) {
      filter.date = {}
      if (from) (filter.date as Record<string, unknown>).$gte = midnight(from)
      if (to) {
        const end = midnight(to); end.setHours(23, 59, 59, 999)
        ;(filter.date as Record<string, unknown>).$lte = end
      }
    }
    if (campusId) {
      try {
        const cOid = new Types.ObjectId(campusId)
        filter.$or = [{ campusId: cOid }, { campusId: { $exists: false } }, { campusId: null }]
      } catch {}
    }

    await connectDB()

    const days = await SpecialDay.find(filter)
      .populate('campusId', 'name')
      .sort({ date: 1 })

    return withToken(json(days), refreshedToken)
  } catch (err) {
    console.error('[GET /api/integrated-school/special-days]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/integrated-school/special-days */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IS_ACADEMICS_MANAGER', 'ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { date, campusId, type, notes } = await req.json()

    if (!date || !type) {
      return withToken(json({ error: 'date and type are required' }, 400), refreshedToken)
    }

    const dayData: Record<string, unknown> = {
      date:  midnight(date),
      type,
      notes: notes ?? undefined,
    }
    if (campusId) {
      try { dayData.campusId = new Types.ObjectId(campusId) } catch {
        return withToken(json({ error: 'Invalid campusId' }, 400), refreshedToken)
      }
    }

    await connectDB()

    try {
      const day       = await SpecialDay.create(dayData)
      const populated = await day.populate('campusId', 'name')
      return withToken(json(populated, 201), refreshedToken)
    } catch (err: unknown) {
      const e = err as { code?: number }
      if (e.code === 11000) {
        return withToken(json({
          error: 'A special day of this type already exists for this campus on this date',
        }, 409), refreshedToken)
      }
      throw err
    }
  } catch (err) {
    console.error('[POST /api/integrated-school/special-days]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
