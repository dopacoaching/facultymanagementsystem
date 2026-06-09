import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@/lib/models/Faculty'
import { Session } from '@/lib/models/Session'
import { SalaryRecord } from '@/lib/models/SalaryRecord'
import { PermanentFacultyContract } from '@/lib/models/PermanentFacultyContract'

/** GET /api/hr/dashboard?month=&year= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
    const year  = Number(searchParams.get('year')  ?? new Date().getFullYear())
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return withToken(json({ error: 'Invalid month or year' }, 400), refreshedToken)
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate   = new Date(year, month,     1)

    await connectDB()

    const [faculty, contracts, salaryRecords, cancelledSessions, hoursAgg] = await Promise.all([
      Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
      PermanentFacultyContract.find({}).lean(),
      SalaryRecord.find({ month, year }).lean(),
      Session.find({
        status:      'CANCELLED',
        sessionDate: { $gte: startDate, $lt: endDate },
      })
        .populate('facultyId', 'name')
        .sort({ sessionDate: -1 })
        .limit(15)
        .lean(),
      Session.aggregate([
        {
          $match: {
            status:      { $in: ['COMPLETED', 'SCHEDULED'] },
            sessionDate: { $gte: startDate, $lt: endDate },
          },
        },
        {
          $group: {
            _id:          '$facultyId',
            totalHours:   { $sum: '$durationHours' },
            sessionCount: { $sum: 1 },
          },
        },
      ]),
    ])

    const contractMap = new Map(contracts.map((c) => [c.facultyId.toString(), c]))
    const recordMap   = new Map(salaryRecords.map((r) => [r.facultyId.toString(), r]))
    const hoursMap    = new Map(hoursAgg.map((h: { _id: Types.ObjectId; totalHours: number; sessionCount: number }) => [h._id.toString(), h]))

    // Panel 1 + 2: Hours Progress (quota-based faculty only)
    const QUOTA_TYPES = ['FIXED_QUOTA_CARRYFORWARD', 'FIXED_QUOTA_NOCARRY', 'BASE_OVERTIME']
    const hoursProgress = faculty
      .map((f) => {
        const contract = contractMap.get(f._id.toString())
        if (!contract || !QUOTA_TYPES.includes(contract.contractType)) return null
        const quota   = (contract.monthlyHourQuota ?? contract.overtimeThresholdHours ?? 0) as number
        const logged  = (hoursMap.get(f._id.toString())?.totalHours ?? 0) as number
        const pct     = quota > 0 ? Math.round((logged / quota) * 100) : 100
        const deficit = Math.max(0, quota - logged)
        const surplus = Math.max(0, logged - quota)
        const status  = pct >= 100 ? 'MET' : pct >= 70 ? 'ON_TRACK' : pct >= 40 ? 'AT_RISK' : 'MISSED'
        return { facultyId: f._id, name: f.name, subject: f.subject, contractType: contract.contractType, quota, logged, pct, deficit, surplus, status }
      })
      .filter(Boolean)

    // Panel 6: Payroll Status (all faculty)
    const payrollStatus = faculty.map((f) => {
      const record   = recordMap.get(f._id.toString())
      const contract = contractMap.get(f._id.toString())
      let status = 'PENDING'
      let finalPayable: number | null = null
      let penaltiesApplied: number | null = null
      let overtimePay: number | null = null

      if (record?.status === 'APPROVED') {
        status           = 'APPROVED'
        finalPayable     = record.finalPayable
        penaltiesApplied = record.penaltiesApplied
        overtimePay      = record.overtimePay
      } else if (contract?.contractType === 'CONFIGURABLE' && !contract.isConfigured) {
        status = 'BLOCKED'
      }
      return { facultyId: f._id, name: f.name, subject: f.subject, salaryModel: f.salaryModel, status, finalPayable, penaltiesApplied, overtimePay }
    })

    // Panels 3 + 4: Aggregated totals from approved records
    const approvedRecs       = salaryRecords.filter((r) => r.status === 'APPROVED')
    const totalPenalties     = approvedRecs.reduce((s, r) => s + (r.penaltiesApplied ?? 0), 0)
    const totalOvertimePay   = approvedRecs.reduce((s, r) => s + (r.overtimePay   ?? 0), 0)
    const totalOvertimeHours = approvedRecs.reduce((s, r) => s + (r.overtimeHours ?? 0), 0)
    const totalPayroll       = approvedRecs.reduce((s, r) => s + (r.finalPayable  ?? 0), 0)

    // Panel 5: Cancellation log (fetched with limit 15)
    const cancellationLog = cancelledSessions.map((s) => ({
      sessionId:             s._id,
      facultyName:           (s.facultyId as unknown as { name: string })?.name ?? 'Unknown',
      subject:               s.subject,
      chapter:               s.chapter,
      sessionDate:           s.sessionDate,
      durationHours:         s.durationHours,
      cancellationInitiator: s.cancellationInitiator ?? 'UNKNOWN',
    }))

    return withToken(json({
      month,
      year,
      hoursProgress,
      payrollStatus,
      cancellationLog,
      totals: {
        totalPenalties,
        totalOvertimePay,
        totalOvertimeHours,
        totalPayroll,
        approved:     approvedRecs.length,
        pending:      payrollStatus.filter((p) => p.status === 'PENDING').length,
        blocked:      payrollStatus.filter((p) => p.status === 'BLOCKED').length,
        totalFaculty: faculty.length,
      },
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/dashboard]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
