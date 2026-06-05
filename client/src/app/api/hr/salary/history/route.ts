import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { SalaryRecord } from '@/lib/models/SalaryRecord'

/** GET /api/hr/salary/history — faculty view their own approved salary records */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'FACULTY')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const facultyId = payload.facultyId
    if (!facultyId) {
      return withToken(json({ error: 'Faculty account not linked to a faculty profile' }, 403), refreshedToken)
    }

    await connectDB()

    const records = await SalaryRecord.find({
      facultyId: new Types.ObjectId(facultyId),
      status:    'APPROVED',
    })
      .sort({ year: -1, month: -1 })
      .limit(24)

    return withToken(json(records), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/salary/history]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
