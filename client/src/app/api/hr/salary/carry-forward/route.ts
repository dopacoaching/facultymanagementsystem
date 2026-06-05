import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { CarryForwardBalance } from '@/lib/models/CarryForwardBalance'

/** GET /api/hr/salary/carry-forward?facultyId= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const facultyId = searchParams.get('facultyId')

    if (!facultyId) {
      return withToken(json({ error: 'facultyId required' }, 400), refreshedToken)
    }

    let fid: Types.ObjectId
    try { fid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    const balances = await CarryForwardBalance.find({ facultyId: fid }).sort({ year: -1, month: -1 })
    return withToken(json(balances), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/salary/carry-forward]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
