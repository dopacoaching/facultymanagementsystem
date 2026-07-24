import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { Faculty } from '../models/Faculty'
import { SalaryRecord } from '../models/SalaryRecord'
import { AuditLog } from '../models/AuditLog'
import { CarryForwardBalance } from '../models/CarryForwardBalance'
import { PayableDays } from '../models/PayableDays'
import { Session } from '../models/Session'
import { PermanentFacultyContract } from '../models/PermanentFacultyContract'
import { calculateMonthlySalary, redactForFacultyView } from '../services/salary/calculator'
import { writeAuditLog } from '../services/salary/audit'
import { asyncHandler } from '../utils/asyncHandler'
import { validateObjectId } from '../utils/objectId'
import { Types } from 'mongoose'

// Whitelisted fields for contract updates — prevents mass assignment of facultyId, _id, etc.
const CONTRACT_WRITABLE = [
  'hourlyRate', 'fixedMonthlySalary', 'monthlyHourQuota', 'hasCarryForward',
  'minDaysNormal', 'minDaysDryMonths', 'dryMonths', 'monthlyLeaveAllowance',
  'aprilLeaveAllowance', 'overtimeThresholdHours', 'overtimeRatePerHour',
  'fixedComponent', 'variableComponent', 'cancellationPenaltyPerClass',
  'minHoursRequirement', 'shortfallRatePerHour', 'classRatePerHour',
  'isConfigured', 'configurablePayJson', 'notes',
] as const

export const calcSalary = asyncHandler(async (req: AuthRequest, res: Response) => {
  let { facultyId, month, year } = req.query as { facultyId?: string; month?: string; year?: string }

  // FACULTY scope guard — a faculty user may only view their own salary
  if (req.user!.role === 'FACULTY') {
    const theirFacultyId = req.user!.facultyId
    if (!theirFacultyId) {
      res.status(403).json({ error: 'Faculty account not linked to a faculty profile' }); return
    }
    // Silently override to their own id — prevents horizontal privilege escalation
    facultyId = theirFacultyId
  }

  if (!facultyId || !month || !year) {
    res.status(400).json({ error: 'facultyId, month, year required' }); return
  }

  // Validate month/year are numeric
  if (isNaN(Number(month)) || isNaN(Number(year))) {
    res.status(400).json({ error: 'month and year must be numbers' }); return
  }

  const result = await calculateMonthlySalary(facultyId, Number(month), Number(year))
  // Faculty may never see surplus/carry-forward detail — only HR does (via the dashboard).
  res.json(req.user!.role === 'FACULTY' ? redactForFacultyView(result) : result)
})

export const approveSalary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId, month, year } = req.body
  if (!facultyId || !month || !year) {
    res.status(400).json({ error: 'facultyId, month, year required' }); return
  }

  // Guard: prevent re-approval — a salary record already exists and is APPROVED
  const existing = await SalaryRecord.findOne({
    facultyId: new Types.ObjectId(facultyId),
    month: Number(month),
    year: Number(year),
    status: 'APPROVED',
  })
  if (existing) {
    res.status(409).json({
      error: `Salary for ${month}/${year} has already been approved on ${
        existing.approvedAt
          ? existing.approvedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'an earlier date'
      }. Re-approval is not allowed.`,
    })
    return
  }

  // persist = true → commit audit-log rows + carry-forward balance (this is the approval)
  const result = await calculateMonthlySalary(facultyId, Number(month), Number(year), true)
  if (result.status === 'BLOCKED' || result.status === 'PENDING_CONFIG') {
    res.status(422).json({ error: result.reason ?? 'Payroll blocked', blocked: true }); return
  }

  const faculty = await Faculty.findById(facultyId)
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }

  const record = await SalaryRecord.findOneAndUpdate(
    { facultyId: new Types.ObjectId(facultyId), month: Number(month), year: Number(year), status: { $ne: 'APPROVED' } },
    {
      hoursLogged: result.hoursLogged ?? 0,
      daysWorked: result.daysWorked ?? 0,
      leavesTaken: result.leavesTaken ?? 0,
      overtimeHours: result.overtimeHours ?? 0,
      overtimePay: result.overtimePay ?? 0,
      baseSalary: result.baseSalary ?? 0,
      penaltiesApplied: result.penalties ?? 0,
      totalDeductions: result.penalties ?? 0,
      finalPayable: result.finalPayable ?? 0,
      monthBalance: result.monthBalance ?? 0,
      status: 'APPROVED',
      approvedByUserId: new Types.ObjectId(req.user!.userId),
      approvedAt: new Date(),
    },
    { upsert: true, new: true }
  )

  await writeAuditLog({
    category: 'HR', eventType: 'SALARY_APPROVED',
    actorUserId: req.user!.userId, actorRole: req.user!.role,
    targetType: 'Faculty', targetId: String(facultyId), targetName: faculty.name,
    facultyId, facultyName: faculty.name, amount: result.finalPayable ?? 0,
    description: `Salary approved for ${month}/${year} — ₹${result.finalPayable?.toLocaleString('en-IN')}`,
  })

  res.json({ success: true, record })
})

export const getAuditLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId, eventType, page = '1', limit = '50' } = req.query
  const filter: Record<string, unknown> = {}
  if (facultyId) {
    try { filter.facultyId = new Types.ObjectId(facultyId as string) } catch {
      res.status(400).json({ error: 'Invalid facultyId' }); return
    }
  }
  if (eventType && eventType !== 'ALL') {
    filter.eventType = eventType
  }

  const p = Math.max(1, Number(page))
  const l = Math.min(100, Math.max(1, Number(limit)))
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip((p - 1) * l).limit(l),
    AuditLog.countDocuments(filter),
  ])
  res.json({ logs, total, page: p, limit: l })
})

export const getCarryForward = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId } = req.query
  const fid = validateObjectId(facultyId as string | undefined, 'facultyId', res)
  if (!fid) return
  const balances = await CarryForwardBalance.find({ facultyId: fid }).sort({ year: -1, month: -1 })
  res.json(balances)
})

/** GET /hr/salary/payable-days?facultyId=&month=&year= */
export const getPayableDays = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId, month, year } = req.query as { facultyId?: string; month?: string; year?: string }
  const fid = validateObjectId(facultyId, 'facultyId', res)
  if (!fid) return
  if (!month || !year) { res.status(400).json({ error: 'facultyId, month, year required' }); return }

  const record = await PayableDays.findOne({ facultyId: fid, month: Number(month), year: Number(year) })
  res.json({ payableDays: record?.payableDays ?? null })
})

/** POST /hr/salary/payable-days — { facultyId, month, year, payableDays } */
export const setPayableDaysCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId, month, year, payableDays } = req.body as {
    facultyId?: string; month?: number; year?: number; payableDays?: number
  }
  const fid = validateObjectId(facultyId, 'facultyId', res)
  if (!fid) return
  if (!month || !year || payableDays === undefined) {
    res.status(400).json({ error: 'facultyId, month, year, payableDays required' }); return
  }
  if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || isNaN(payableDays) || payableDays < 0 || payableDays > 31) {
    res.status(400).json({ error: 'Invalid month, year, or payableDays' }); return
  }

  const faculty = await Faculty.findById(fid)
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }

  const record = await PayableDays.findOneAndUpdate(
    { facultyId: fid, month, year },
    { payableDays, enteredByUserId: new Types.ObjectId(req.user!.userId) },
    { upsert: true, new: true, runValidators: true },
  )

  await writeAuditLog({
    category: 'HR', eventType: 'PAY_CONFIG_UPDATED',
    actorUserId: req.user!.userId, actorRole: req.user!.role,
    targetType: 'Faculty', targetId: String(fid), targetName: faculty.name,
    facultyId: String(fid), facultyName: faculty.name, amount: 0,
    description: `Payable Days set for ${faculty.name} — ${month}/${year}: ${payableDays} day(s)`,
  })

  res.json(record)
})

export const getSalaryReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year } = req.query
  if (!month || !year) { res.status(400).json({ error: 'month and year required' }); return }

  const records = await SalaryRecord.find({
    month: Number(month),
    year: Number(year),
    status: 'APPROVED',
  })
    .populate('facultyId', 'name subject type')
    .sort({ finalPayable: -1 })

  // Flatten for client: expose name at top level
  const flattened = records.map((r) => {
    const fac = r.facultyId as unknown as { _id: string; name: string; subject: string; type: string } | null
    return {
      _id: r._id,
      facultyId: fac?._id ?? r.facultyId,
      name: fac?.name ?? 'Unknown',
      subject: fac?.subject ?? '',
      month: r.month,
      year: r.year,
      hoursLogged: r.hoursLogged,
      daysWorked: r.daysWorked,
      baseSalary: r.baseSalary,
      overtimePay: r.overtimePay,
      penaltiesApplied: r.penaltiesApplied,
      finalPayable: r.finalPayable,
      status: r.status,
      approvedAt: r.approvedAt,
    }
  })

  res.json(flattened)
})

/**
 * GET /hr/salary/history — faculty view their own approved salary records.
 * Restricted to FACULTY role; returns the last 24 months of approved records.
 */
export const getMyHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyId = req.user!.facultyId
  if (!facultyId) {
    res.status(403).json({ error: 'Faculty account not linked to a faculty profile' }); return
  }

  const records = await SalaryRecord.find({
    facultyId: new Types.ObjectId(facultyId),
    status: 'APPROVED',
  })
    .sort({ year: -1, month: -1 })
    .limit(24)

  res.json(records)
})

// ─── HR Dashboard ──────────────────────────────────────────────────────────────

/**
 * GET /hr/dashboard?month=M&year=Y
 * Aggregates: hours progress, payroll status, cancellation log, and totals.
 * HR_MANAGER and ADMIN only.
 */
export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const month = Number(req.query.month ?? new Date().getMonth() + 1)
  const year  = Number(req.query.year  ?? new Date().getFullYear())

  const startDate = new Date(year, month - 1, 1)
  const endDate   = new Date(year, month,     1)

  const [faculty, contracts, salaryRecords, payableDaysRecords, cancelledSessions, hoursAgg] = await Promise.all([
    Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
    PermanentFacultyContract.find({}).lean(),
    SalaryRecord.find({ month, year }).lean(),
    PayableDays.find({ month, year }).lean(),
    Session.find({
      status: 'CANCELLED',
      sessionDate: { $gte: startDate, $lt: endDate },
    })
      .populate('facultyId', 'name')
      .sort({ sessionDate: -1 })
      .limit(15)
      .lean(),
    Session.aggregate([
      {
        $match: {
          status: { $in: ['COMPLETED', 'SCHEDULED'] },
          sessionDate: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: '$facultyId',
          totalHours: { $sum: '$durationHours' },
          sessionCount: { $sum: 1 },
        },
      },
    ]),
  ])

  const contractMap = new Map(contracts.map((c) => [c.facultyId.toString(), c]))
  const recordMap   = new Map(salaryRecords.map((r) => [r.facultyId.toString(), r]))
  const hoursMap    = new Map(hoursAgg.map((h: { _id: Types.ObjectId; totalHours: number; sessionCount: number }) => [h._id.toString(), h]))
  const payableDaysSet = new Set(payableDaysRecords.map((p) => p.facultyId.toString()))

  // Panel 1 + 2: Hours Progress (quota-based faculty only)
  const QUOTA_TYPES = ['FIXED_QUOTA_CARRYFORWARD', 'FIXED_QUOTA_NOCARRY', 'BASE_OVERTIME', 'BASE_OVERTIME_PENALTY', 'SPLIT_FIXED_VARIABLE']
  const hoursProgress = faculty
    .map((f) => {
      const contract = contractMap.get(f._id.toString())
      if (!contract || !QUOTA_TYPES.includes(contract.contractType)) return null
      const quota  = (contract.monthlyHourQuota ?? contract.overtimeThresholdHours ?? contract.minHoursRequirement ?? 0) as number
      const logged = (hoursMap.get(f._id.toString())?.totalHours ?? 0) as number
      const pct    = quota > 0 ? Math.round((logged / quota) * 100) : 100
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
      status = 'APPROVED'
      finalPayable     = record.finalPayable
      penaltiesApplied = record.penaltiesApplied
      overtimePay      = record.overtimePay
    } else if (contract?.contractType === 'CONFIGURABLE' && !contract.isConfigured) {
      status = 'BLOCKED'
    } else if (contract?.contractType === 'OFFICE_STAFF_LEAVE_BASED' && !payableDaysSet.has(f._id.toString())) {
      status = 'BLOCKED'
    }
    return { facultyId: f._id, name: f.name, subject: f.subject, salaryModel: f.salaryModel, status, finalPayable, penaltiesApplied, overtimePay }
  })

  // Panels 3 + 4: Aggregated totals from approved records
  const approvedRecs   = salaryRecords.filter((r) => r.status === 'APPROVED')
  const totalPenalties = approvedRecs.reduce((s, r) => s + (r.penaltiesApplied ?? 0), 0)
  const totalOvertimePay   = approvedRecs.reduce((s, r) => s + (r.overtimePay   ?? 0), 0)
  const totalOvertimeHours = approvedRecs.reduce((s, r) => s + (r.overtimeHours ?? 0), 0)
  const totalPayroll   = approvedRecs.reduce((s, r) => s + (r.finalPayable  ?? 0), 0)

  // Panel 5: Cancellation log (fetched with limit 15)
  const cancellationLog = cancelledSessions.map((s) => ({
    sessionId: s._id,
    facultyName: (s.facultyId as unknown as { name: string })?.name ?? 'Unknown',
    subject: s.subject,
    chapter: s.chapter,
    sessionDate: s.sessionDate,
    durationHours: s.durationHours,
    cancellationInitiator: s.cancellationInitiator ?? 'UNKNOWN',
  }))

  res.json({
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
  })
})

/**
 * GET /hr/salary/my-hours-summary — faculty view their own hours per month.
 * Aggregates completed sessions grouped by year+month for the last 12 months.
 * FACULTY only.
 */
export const getMyHoursSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyId = req.user!.facultyId
  if (!facultyId) {
    res.status(403).json({ error: 'Faculty account not linked to a faculty profile' }); return
  }

  const cutoff = new Date()
  cutoff.setDate(1)
  cutoff.setMonth(cutoff.getMonth() - 11)
  cutoff.setHours(0, 0, 0, 0)

  const [agg, allTime] = await Promise.all([
    Session.aggregate([
      {
        $match: {
          facultyId: new Types.ObjectId(facultyId),
          status: 'COMPLETED',
          sessionDate: { $gte: cutoff },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$sessionDate' }, month: { $month: '$sessionDate' } },
          totalHours: { $sum: '$durationHours' },
          sessionCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]),
    // All-time totals — no date filter, covers every completed session ever logged.
    Session.aggregate([
      { $match: { facultyId: new Types.ObjectId(facultyId), status: 'COMPLETED' } },
      { $group: { _id: null, totalHours: { $sum: '$durationHours' }, sessionCount: { $sum: 1 } } },
    ]),
  ])

  res.json({
    months: agg.map((item) => ({
      year: item._id.year,
      month: item._id.month,
      totalHours: item.totalHours,
      sessionCount: item.sessionCount,
    })),
    allTimeTotalHours:   allTime[0]?.totalHours   ?? 0,
    allTimeSessionCount: allTime[0]?.sessionCount ?? 0,
  })
})

// ─── Contract CRUD ─────────────────────────────────────────────────────────────

/**
 * GET /hr/contract/:facultyId
 * Returns the PermanentFacultyContract for a faculty.
 */
export const getContract = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fid = validateObjectId(req.params.facultyId, 'facultyId', res)
  if (!fid) return
  const contract = await PermanentFacultyContract.findOne({ facultyId: fid })
  if (!contract) { res.status(404).json({ error: 'No contract found for this faculty' }); return }
  res.json(contract)
})

/**
 * PATCH /hr/contract/:facultyId
 * Updates contract fields — used for CONFIGURABLE salary contracts.
 * Only HR_MANAGER and ADMIN may update contracts.
 * Whitelists allowed fields to prevent mass assignment (e.g. of facultyId, _id).
 */
export const updateContract = asyncHandler(async (req: AuthRequest, res: Response) => {
  const fid = validateObjectId(req.params.facultyId, 'facultyId', res)
  if (!fid) return

  // Build update from whitelisted fields only
  const safeUpdate: Record<string, unknown> = {}
  for (const key of CONTRACT_WRITABLE) {
    if ((req.body as Record<string, unknown>)[key] !== undefined) {
      safeUpdate[key] = (req.body as Record<string, unknown>)[key]
    }
  }
  if (Object.keys(safeUpdate).length === 0) {
    res.status(400).json({ error: 'No valid contract fields provided' }); return
  }

  const contract = await PermanentFacultyContract.findOneAndUpdate(
    { facultyId: fid },
    { $set: safeUpdate },
    { new: true, runValidators: true },
  )
  if (!contract) { res.status(404).json({ error: 'No contract found for this faculty' }); return }

  // Keep Faculty.requiresSessionCategory in lockstep with contractType so the
  // two never drift apart — contractType isn't in CONTRACT_WRITABLE today (it
  // can only change via an admin script), but this guards against future drift
  // the moment it is exposed for editing here.
  if ('contractType' in safeUpdate) {
    await Faculty.findByIdAndUpdate(fid, {
      requiresSessionCategory: safeUpdate.contractType === 'DOUBT_CLEARANCE_SPLIT_RATE',
    })
  }

  const faculty = await Faculty.findById(fid)
  await writeAuditLog({
    category: 'HR', eventType: 'PAY_CONFIG_UPDATED',
    actorUserId: req.user!.userId, actorRole: req.user!.role,
    targetType: 'Faculty', targetId: fid.toString(), targetName: faculty?.name ?? 'Unknown',
    facultyId: fid.toString(), facultyName: faculty?.name ?? 'Unknown',
    description: `Contract updated (${Object.keys(safeUpdate).join(', ')})`,
  })

  res.json(contract)
})
