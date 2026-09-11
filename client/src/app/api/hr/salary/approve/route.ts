import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@/lib/models/Faculty'
import { SalaryRecord } from '@/lib/models/SalaryRecord'
import { calculateMonthlySalary, calculateRangeSalary } from '@/lib/services/salary/calculator'
import { writeAuditLog } from '@/lib/services/salary/audit'
import type { SalaryResult } from '@/lib/types'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function parseLocalDate(iso: string): Date | null {
  const m = DATE_RE.exec(iso ?? '')
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (isNaN(dt.getTime())) return null
  // Reject impossible calendar dates (e.g. 2026-06-00, 2026-02-30) that JS
  // silently rolls into an adjacent month.
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

const fmtDay = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/** POST /api/hr/salary/approve — body: { facultyId, month, year }  OR  { facultyId, from, to } */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { facultyId, month, year, from, to } = await req.json()
    if (!facultyId) {
      return withToken(json({ error: 'facultyId required' }, 400), refreshedToken)
    }

    await connectDB()
    const fOid = new Types.ObjectId(facultyId)
    const isRange = from != null || to != null

    // ─── Shared record-write + audit tail ────────────────────────────────────
    const writeRecord = async (
      result: SalaryResult,
      filter: Record<string, unknown>,
      extraFields: Record<string, unknown>,
      periodLabel: string,
      faculty: { name: string },
    ) => {
      // status: { $ne: 'APPROVED' } is an atomic guard against concurrent double-approval.
      const record = await SalaryRecord.findOneAndUpdate(
        { ...filter, status: { $ne: 'APPROVED' } },
        {
          ...extraFields,
          hoursLogged:      result.hoursLogged   ?? 0,
          daysWorked:       result.daysWorked    ?? 0,
          leavesTaken:      result.leavesTaken   ?? 0,
          overtimeHours:    result.overtimeHours ?? 0,
          overtimePay:      result.overtimePay   ?? 0,
          baseSalary:       result.baseSalary    ?? 0,
          penaltiesApplied: result.penalties     ?? 0,
          totalDeductions:  result.penalties     ?? 0,
          finalPayable:     result.finalPayable  ?? 0,
          tds:              result.tds           ?? 0,
          netPayable:       result.netPayable    ?? 0,
          monthBalance:     result.monthBalance  ?? 0,
          status:           'APPROVED',
          approvedByUserId: new Types.ObjectId(payload.userId),
          approvedAt:       new Date(),
        },
        { upsert: true, new: true },
      )

      await writeAuditLog({
        category: 'HR', eventType: 'SALARY_APPROVED',
        actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
        targetType: 'Faculty', targetId: facultyId, targetName: faculty.name,
        facultyId, facultyName: faculty.name, amount: result.finalPayable ?? 0,
        description: `Salary approved for ${faculty.name} — ${periodLabel} — ₹${result.finalPayable?.toLocaleString('en-IN')}`,
      })

      return record
    }

    // ─── Date-range approval (TEMPORARY faculty, paid by the week) ────────────
    if (isRange) {
      const fromDate = parseLocalDate(from)
      const toDate = parseLocalDate(to)
      if (!fromDate || !toDate) {
        return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
      }
      if (fromDate.getTime() > toDate.getTime()) {
        return withToken(json({ error: 'from date must be on or before to date' }, 400), refreshedToken)
      }

      // Overlap guard — no two approved windows may cover the same day.
      const clash = await SalaryRecord.findOne({
        facultyId: fOid,
        periodType: 'RANGE',
        status: 'APPROVED',
        periodStart: { $lte: toDate },
        periodEnd: { $gte: fromDate },
      })
      if (clash) {
        return withToken(json({
          error: `This faculty already has approved pay for a period overlapping ${fmtDay(fromDate)} – ${fmtDay(toDate)}${
            clash.periodStart && clash.periodEnd ? ` (${fmtDay(clash.periodStart)} – ${fmtDay(clash.periodEnd)})` : ''
          }. Re-approval is not allowed.`,
        }, 409), refreshedToken)
      }

      const result = await calculateRangeSalary(facultyId, from, to)
      if (result.status === 'BLOCKED' || result.status === 'PENDING_CONFIG') {
        return withToken(json({ error: result.reason ?? 'Payroll blocked', blocked: true }, 422), refreshedToken)
      }

      const faculty = await Faculty.findById(facultyId)
      if (!faculty) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)

      let record
      try {
        record = await writeRecord(
          result,
          { facultyId: fOid, periodType: 'RANGE', periodStart: fromDate, periodEnd: toDate },
          {
            periodType: 'RANGE',
            periodStart: fromDate,
            periodEnd: toDate,
            // Derived so month-keyed dashboards/reports still bucket the record.
            month: fromDate.getMonth() + 1,
            year: fromDate.getFullYear(),
          },
          `${fmtDay(fromDate)} – ${fmtDay(toDate)}`,
          faculty,
        )
      } catch (e) {
        // Partial-unique { facultyId, periodStart, periodEnd } on periodType:'RANGE'
        // — a concurrent request already approved this exact window.
        if ((e as { code?: number })?.code === 11000) {
          return withToken(json({
            error: `This faculty already has approved pay for ${fmtDay(fromDate)} – ${fmtDay(toDate)}. Re-approval is not allowed.`,
          }, 409), refreshedToken)
        }
        throw e
      }
      return withToken(json({ success: true, record }), refreshedToken)
    }

    // ─── Calendar-month approval (unchanged) ─────────────────────────────────
    if (!month || !year) {
      return withToken(json({ error: 'facultyId, month, year required' }, 400), refreshedToken)
    }
    const m = Number(month), y = Number(year)
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2020 || y > 2100) {
      return withToken(json({ error: 'Invalid month or year' }, 400), refreshedToken)
    }

    // Guard: prevent re-approval
    const existing = await SalaryRecord.findOne({
      facultyId: fOid,
      month:  m,
      year:   y,
      periodType: { $ne: 'RANGE' },
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
    const result = await calculateMonthlySalary(facultyId, m, y, true)
    if (result.status === 'BLOCKED' || result.status === 'PENDING_CONFIG') {
      return withToken(json({ error: result.reason ?? 'Payroll blocked', blocked: true }, 422), refreshedToken)
    }

    const faculty = await Faculty.findById(facultyId)
    if (!faculty) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)

    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 0)
    monthEnd.setHours(23, 59, 59, 999)

    const record = await writeRecord(
      result,
      { facultyId: fOid, month: m, year: y, periodType: { $ne: 'RANGE' } },
      { periodType: 'MONTH', month: m, year: y, periodStart: monthStart, periodEnd: monthEnd },
      `${month}/${year}`,
      faculty,
    )
    return withToken(json({ success: true, record }), refreshedToken)
  } catch (err) {
    console.error('[POST /api/hr/salary/approve]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
