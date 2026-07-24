import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@/lib/models/Faculty'
import { PayableDays } from '@/lib/models/PayableDays'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** GET /api/hr/salary/payable-days?facultyId=&month=&year= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const facultyId = searchParams.get('facultyId')
    const month = searchParams.get('month')
    const year  = searchParams.get('year')

    if (!facultyId || !month || !year) {
      return withToken(json({ error: 'facultyId, month, year required' }, 400), refreshedToken)
    }

    let fid: Types.ObjectId
    try { fid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    const record = await PayableDays.findOne({ facultyId: fid, month: Number(month), year: Number(year) })
    return withToken(json({ payableDays: record?.payableDays ?? null }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/salary/payable-days]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/hr/salary/payable-days — { facultyId, month, year, payableDays } */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const body = await req.json() as { facultyId?: string; month?: number; year?: number; payableDays?: number }
    const { facultyId, month, year, payableDays } = body

    if (!facultyId || !month || !year || payableDays === undefined) {
      return withToken(json({ error: 'facultyId, month, year, payableDays required' }, 400), refreshedToken)
    }
    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || isNaN(payableDays) || payableDays < 0 || payableDays > 31) {
      return withToken(json({ error: 'Invalid month, year, or payableDays' }, 400), refreshedToken)
    }

    let fid: Types.ObjectId
    try { fid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    const faculty = await Faculty.findById(fid)
    if (!faculty) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)

    const record = await PayableDays.findOneAndUpdate(
      { facultyId: fid, month, year },
      { payableDays, enteredByUserId: new Types.ObjectId(payload.userId) },
      { upsert: true, new: true, runValidators: true },
    )

    await writeAuditLog({
      category: 'HR', eventType: 'PAY_CONFIG_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'Faculty', targetId: facultyId, targetName: faculty.name,
      facultyId, facultyName: faculty.name, amount: 0,
      description: `Payable Days set for ${faculty.name} — ${month}/${year}: ${payableDays} day(s)`,
    })

    return withToken(json(record), refreshedToken)
  } catch (err) {
    console.error('[POST /api/hr/salary/payable-days]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
