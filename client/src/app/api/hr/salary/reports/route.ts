import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { SalaryRecord } from '@/lib/models/SalaryRecord'

/** GET /api/hr/salary/reports?month=&year= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year  = searchParams.get('year')

    if (!month || !year) {
      return withToken(json({ error: 'month and year required' }, 400), refreshedToken)
    }
    const m = Number(month), y = Number(year)
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
      return withToken(json({ error: 'Invalid month or year' }, 400), refreshedToken)
    }

    await connectDB()

    const records = await SalaryRecord.find({
      month:  m,
      year:   y,
      status: 'APPROVED',
    })
      .populate('facultyId', 'name subject type')
      .sort({ finalPayable: -1 })

    // Flatten for client: expose name at top level
    const flattened = records.map((r) => {
      const fac = r.facultyId as unknown as { _id: string; name: string; subject: string; type: string } | null
      return {
        _id:              r._id,
        facultyId:        fac?._id ?? r.facultyId,
        name:             fac?.name    ?? 'Unknown',
        subject:          fac?.subject ?? '',
        month:            r.month,
        year:             r.year,
        hoursLogged:      r.hoursLogged,
        daysWorked:       r.daysWorked,
        baseSalary:       r.baseSalary,
        overtimePay:      r.overtimePay,
        penaltiesApplied: r.penaltiesApplied,
        finalPayable:     r.finalPayable,
        status:           r.status,
        approvedAt:       r.approvedAt,
      }
    })

    return withToken(json(flattened), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/salary/reports]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
