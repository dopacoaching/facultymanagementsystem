import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { SALARY_ENABLED, SALARY_ON_HOLD_MESSAGE, isRangeRequest, salaryAllowed } from '@/lib/constants/features'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@/lib/models/Faculty'
import { calculateMonthlySalary, calculateRangeSalary, redactForFacultyView } from '@/lib/services/salary/calculator'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** GET /api/hr/salary?facultyId=&month=&year=  — or  ?facultyId=&from=&to= (TEMPORARY faculty) */
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
    const from  = searchParams.get('from')  ?? undefined
    const to    = searchParams.get('to')    ?? undefined
    const isRange = isRangeRequest(from, to)

    // Checked after authentication so an anonymous caller cannot probe what is on hold.
    if (!salaryAllowed(isRange)) {
      return withToken(json({ error: SALARY_ON_HOLD_MESSAGE }, 503), refreshedToken)
    }

    // With month-based salary on hold, faculty do not see any salary (temporary-faculty ranges are HR/Admin only).
    if (!SALARY_ENABLED && payload.role === 'FACULTY') {
      return withToken(json({ error: SALARY_ON_HOLD_MESSAGE }, 503), refreshedToken)
    }

    // FACULTY scope guard — a faculty user may only view their own salary
    if (payload.role === 'FACULTY') {
      const theirFacultyId = payload.facultyId
      if (!theirFacultyId) {
        return withToken(json({ error: 'Faculty account not linked to a faculty profile' }, 403), refreshedToken)
      }
      facultyId = theirFacultyId
    }

    if (!facultyId) {
      return withToken(json({ error: 'facultyId required' }, 400), refreshedToken)
    }

    if (!Types.ObjectId.isValid(facultyId)) {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    // While month pay is on hold only temporary faculty may be paid — enforced here, not just by the calculator.
    if (!SALARY_ENABLED) {
      const faculty = await Faculty.findById(facultyId).select('type')
      if (!faculty || faculty.type !== 'TEMPORARY') {
        return withToken(json({ error: 'Only temporary faculty salary is available right now.' }, 403), refreshedToken)
      }
    }

    // Date-range mode (TEMPORARY faculty, paid by the week) — the calculator
    // itself rejects non-temporary faculty.
    if (isRange) {
      if (!DATE_RE.test(from ?? '') || !DATE_RE.test(to ?? '')) {
        return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
      }
      const rangeResult = await calculateRangeSalary(facultyId, from!, to!)
      return withToken(json(payload.role === 'FACULTY' ? redactForFacultyView(rangeResult) : rangeResult), refreshedToken)
    }

    if (!month || !year) {
      return withToken(json({ error: 'facultyId, month, year required' }, 400), refreshedToken)
    }

    if (isNaN(Number(month)) || isNaN(Number(year))) {
      return withToken(json({ error: 'month and year must be numbers' }, 400), refreshedToken)
    }

    const result = await calculateMonthlySalary(facultyId, Number(month), Number(year))
    // Faculty may never see surplus/carry-forward detail — only HR does (via the dashboard).
    return withToken(json(payload.role === 'FACULTY' ? redactForFacultyView(result) : result), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/salary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
