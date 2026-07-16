import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { calculateMonthlySalary, redactForFacultyView } from '@/lib/services/salary/calculator'

/** GET /api/hr/salary?facultyId=&month=&year= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN', 'FACULTY')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    let facultyId = searchParams.get('facultyId') ?? undefined
    const month = searchParams.get('month') ?? undefined
    const year  = searchParams.get('year')  ?? undefined

    // FACULTY scope guard — a faculty user may only view their own salary
    if (payload.role === 'FACULTY') {
      const theirFacultyId = payload.facultyId
      if (!theirFacultyId) {
        return withToken(json({ error: 'Faculty account not linked to a faculty profile' }, 403), refreshedToken)
      }
      facultyId = theirFacultyId
    }

    if (!facultyId || !month || !year) {
      return withToken(json({ error: 'facultyId, month, year required' }, 400), refreshedToken)
    }

    if (isNaN(Number(month)) || isNaN(Number(year))) {
      return withToken(json({ error: 'month and year must be numbers' }, 400), refreshedToken)
    }

    await connectDB()

    const result = await calculateMonthlySalary(facultyId, Number(month), Number(year))
    // Faculty may never see surplus/carry-forward detail — only HR does (via the dashboard).
    return withToken(json(payload.role === 'FACULTY' ? redactForFacultyView(result) : result), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/salary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
