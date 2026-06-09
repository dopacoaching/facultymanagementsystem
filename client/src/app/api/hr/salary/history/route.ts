import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { SalaryRecord } from '@/lib/models/SalaryRecord'

/** GET /api/hr/salary/history — faculty view their own records; HR_MANAGER/ADMIN can view any faculty via ?facultyId= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'FACULTY', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const isManager = payload.role === 'HR_MANAGER' || payload.role === 'ADMIN'

    // Managers must supply an explicit facultyId; faculty are scoped to their own
    if (isManager && !searchParams.get('facultyId')) {
      return withToken(json({ error: 'facultyId query parameter is required for managers' }, 400), refreshedToken)
    }
    const targetFacultyId = isManager
      ? searchParams.get('facultyId')!
      : payload.facultyId

    if (!targetFacultyId) {
      return withToken(json({ error: 'Faculty account not linked to a faculty profile' }, 403), refreshedToken)
    }

    let fOid: Types.ObjectId
    try { fOid = new Types.ObjectId(targetFacultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    const records = await SalaryRecord.find({ facultyId: fOid, status: 'APPROVED' })
      .sort({ year: -1, month: -1 })
      .limit(24)

    return withToken(json(records), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/salary/history]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
