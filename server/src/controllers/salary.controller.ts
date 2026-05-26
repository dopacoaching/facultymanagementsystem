import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { Faculty } from '../models/Faculty'
import { SalaryRecord } from '../models/SalaryRecord'
import { AuditLog } from '../models/AuditLog'
import { CarryForwardBalance } from '../models/CarryForwardBalance'
import { calculateMonthlySalary } from '../services/salary/calculator'
import { writeAuditLog } from '../services/salary/audit'
import { asyncHandler } from '../utils/asyncHandler'
import { Types } from 'mongoose'

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
  res.json(result)
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

  const result = await calculateMonthlySalary(facultyId, Number(month), Number(year))
  if (result.status === 'BLOCKED' || result.status === 'PENDING_CONFIG') {
    res.status(422).json({ error: result.reason ?? 'Payroll blocked', blocked: true }); return
  }

  const faculty = await Faculty.findById(facultyId)
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }

  const record = await SalaryRecord.findOneAndUpdate(
    { facultyId: new Types.ObjectId(facultyId), month: Number(month), year: Number(year) },
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
    eventType: 'SALARY_APPROVED', facultyId, facultyName: faculty.name,
    amount: result.finalPayable ?? 0,
    reason: `Salary approved for ${month}/${year} — ₹${result.finalPayable?.toLocaleString('en-IN')}`,
    loggedByUserId: req.user!.userId,
  })

  res.json({ success: true, record })
})

export const getAuditLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId, eventType, page = '1', limit = '50' } = req.query
  const filter: Record<string, unknown> = {}
  if (facultyId) {
    try { filter.facultyId = new Types.ObjectId(facultyId as string) } catch {}
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
  if (!facultyId) { res.status(400).json({ error: 'facultyId required' }); return }
  const balances = await CarryForwardBalance.find({
    facultyId: new Types.ObjectId(facultyId as string),
  }).sort({ year: -1, month: -1 })
  res.json(balances)
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
