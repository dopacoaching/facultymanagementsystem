import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { SalaryRecord } from '@/lib/models/SalaryRecord'
import { salaryPeriodOverlapFilter } from '@/lib/utils/dateRange'

/** GET /api/hr/salary/reports?from=&to= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to   = searchParams.get('to')

    if (!from || !to) {
      return withToken(json({ error: 'from and to required' }, 400), refreshedToken)
    }
    const overlap = salaryPeriodOverlapFilter(from, to)
    if (!overlap) {
      return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
    }

    await connectDB()

    // Overlap query: any record whose period touches the requested range —
    // covers MONTH records (periodStart/periodEnd = calendar month), RANGE
    // records (TEMPORARY faculty date windows), and legacy MONTH records
    // approved before the periodStart/periodEnd backfill migration ran (falls
    // back to a month/year match for those).
    const records = await SalaryRecord.find({
      ...overlap,
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
        periodType:       r.periodType ?? 'MONTH',
        periodStart:      r.periodStart ?? null,
        periodEnd:        r.periodEnd ?? null,
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
