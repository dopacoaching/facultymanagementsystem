import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@/lib/models/Faculty'
import { SalaryRecord } from '@/lib/models/SalaryRecord'
import { calculateMonthlySalary } from '@/lib/services/salary/calculator'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** POST /api/hr/salary/approve */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { facultyId, month, year } = await req.json()

    if (!facultyId || !month || !year) {
      return withToken(json({ error: 'facultyId, month, year required' }, 400), refreshedToken)
    }
    const m = Number(month), y = Number(year)
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2020 || y > 2100) {
      return withToken(json({ error: 'Invalid month or year' }, 400), refreshedToken)
    }

    await connectDB()

    // Guard: prevent re-approval
    const existing = await SalaryRecord.findOne({
      facultyId: new Types.ObjectId(facultyId),
      month:  Number(month),
      year:   Number(year),
      status: 'APPROVED',
    })
    if (existing) {
      return withToken(
        json({
          error: `Salary for ${month}/${year} has already been approved on ${
            existing.approvedAt
              ? existing.approvedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'an earlier date'
          }. Re-approval is not allowed.`,
        }, 409),
        refreshedToken,
      )
    }

    // persist = true → commit audit-log rows + carry-forward balance
    const result = await calculateMonthlySalary(facultyId, Number(month), Number(year), true)
    if (result.status === 'BLOCKED' || result.status === 'PENDING_CONFIG') {
      return withToken(json({ error: result.reason ?? 'Payroll blocked', blocked: true }, 422), refreshedToken)
    }

    const faculty = await Faculty.findById(facultyId)
    if (!faculty) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)

    const record = await SalaryRecord.findOneAndUpdate(
      { facultyId: new Types.ObjectId(facultyId), month: Number(month), year: Number(year) },
      {
        hoursLogged:      result.hoursLogged    ?? 0,
        daysWorked:       result.daysWorked     ?? 0,
        leavesTaken:      result.leavesTaken    ?? 0,
        overtimeHours:    result.overtimeHours  ?? 0,
        overtimePay:      result.overtimePay    ?? 0,
        baseSalary:       result.baseSalary     ?? 0,
        penaltiesApplied: result.penalties      ?? 0,
        totalDeductions:  result.penalties      ?? 0,
        finalPayable:     result.finalPayable   ?? 0,
        monthBalance:     result.monthBalance   ?? 0,
        status:           'APPROVED',
        approvedByUserId: new Types.ObjectId(payload.userId),
        approvedAt:       new Date(),
      },
      { upsert: true, new: true }
    )

    await writeAuditLog({
      eventType:   'SALARY_APPROVED',
      facultyId,
      facultyName: faculty.name,
      amount:      result.finalPayable ?? 0,
      reason:      `Salary approved for ${month}/${year} — ₹${result.finalPayable?.toLocaleString('en-IN')}`,
      loggedByUserId: payload.userId,
    })

    return withToken(json({ success: true, record }), refreshedToken)
  } catch (err) {
    console.error('[POST /api/hr/salary/approve]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
