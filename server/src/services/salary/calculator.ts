/**
 * Salary Calculator — strategy-pattern dispatch by ContractType.
 *
 * Each of the 14 permanent faculty has a PermanentFacultyContract document
 * that stores their precise terms. The calculator loads that document and
 * dispatches to the matching handler. Name-based branching is intentionally
 * avoided so adding a new faculty never requires touching existing handlers.
 */

import { Types } from 'mongoose'
import { Faculty, IFaculty } from '../../models/Faculty'
import { Session } from '../../models/Session'
import { CarryForwardBalance } from '../../models/CarryForwardBalance'
import { PermanentFacultyContract, IPermanentFacultyContract } from '../../models/PermanentFacultyContract'
import { writeAuditLog } from './audit'
import {
  SalaryResult,
  SalaryAlert,
  SalaryBreakdown,
} from '../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Count weekdays (Mon–Fri) in a given month. */
function getWorkingDays(year: number, month: number): number {
  const d = new Date(year, month - 1, 1)
  let count = 0
  while (d.getMonth() === month - 1) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

/** Return the (month, year) pair for the month immediately before the given one. */
function prevMonth(month: number, year: number): { month: number; year: number } {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year }
}

function fmt(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

// ─── Contract-type handlers ───────────────────────────────────────────────────

/** HOURLY — Abdul Adil VK, Dr. Sanoop Sebastian, Hisham Abdul Kadir NP, Muhsin AV, Habid PP */
async function calcHourly(
  contract: IPermanentFacultyContract,
  hoursLogged: number,
): Promise<Partial<SalaryResult>> {
  const rate = contract.hourlyRate ?? 0
  const baseSalary = hoursLogged * rate
  const breakdown: SalaryBreakdown[] = [
    { label: 'Hours Logged', amount: hoursLogged },
    { label: 'Rate per Hour', amount: rate },
    { label: 'Total Pay', amount: baseSalary },
  ]
  return { baseSalary, finalPayable: baseSalary, breakdown, alerts: [] }
}

/** FIXED_MONTHLY_MIN_DAYS — Fahad T (min 8 days), Anoop K (min 16 days) */
async function calcFixedMonthlyMinDays(
  contract: IPermanentFacultyContract,
  daysWorked: number,
): Promise<Partial<SalaryResult>> {
  const salary = contract.fixedMonthlySalary ?? 0
  const minDays = contract.minDaysNormal ?? 0
  const alerts: SalaryAlert[] = []
  const breakdown: SalaryBreakdown[] = [
    { label: 'Fixed Monthly Salary', amount: salary },
  ]

  if (daysWorked < minDays) {
    alerts.push({
      level: 'WARNING',
      code: 'MIN_DAYS_NOT_MET',
      message: `Worked ${daysWorked} day(s) — minimum required is ${minDays}. HR review needed.`,
    })
  }

  return {
    baseSalary: salary,
    finalPayable: salary,
    breakdown,
    alerts,
    status: alerts.some((a) => a.level === 'WARNING') ? 'HR_REVIEW' : undefined,
  }
}

/** FIXED_MONTHLY_LEAVE — Muhammed Ashique EK */
async function calcFixedMonthlyLeave(
  contract: IPermanentFacultyContract,
  daysWorked: number,
  month: number,
  year: number,
  facultyName: string,
  facultyId: string,
  persist: boolean,
): Promise<Partial<SalaryResult>> {
  const salary = contract.fixedMonthlySalary ?? 0
  const leaveAllowance = month === 4
    ? (contract.aprilLeaveAllowance ?? 4)
    : (contract.monthlyLeaveAllowance ?? 8)
  const workingDays = getWorkingDays(year, month)
  const leaveTaken = Math.max(0, workingDays - daysWorked)
  const excessLeaves = Math.max(0, leaveTaken - leaveAllowance)
  const perDayRate = salary / workingDays
  // Round to whole rupees — fractional rupees cannot be disbursed via bank transfer.
  const penalties = excessLeaves > 0 ? Math.round(excessLeaves * perDayRate) : 0

  const breakdown: SalaryBreakdown[] = [
    { label: 'Fixed Monthly Salary', amount: salary },
    { label: `Working Days (${workingDays})`, amount: workingDays },
    { label: `Days Worked`, amount: daysWorked },
    { label: `Leave Allowance (${month === 4 ? 'April' : 'Regular'})`, amount: leaveAllowance },
    { label: 'Excess Leave Days', amount: excessLeaves },
  ]
  if (penalties > 0) {
    breakdown.push({ label: 'Excess Leave Deduction', amount: penalties, isDeduction: true })
    if (persist) {
      await writeAuditLog({
        eventType: 'PENALTY_APPLIED',
        facultyId,
        facultyName,
        amount: penalties,
        reason: `${excessLeaves} excess leave day(s) × ${fmt(perDayRate)}/day`,
        loggedByUserId: 'SYSTEM',
      })
    }
  }

  const finalPayable = salary - penalties
  return {
    baseSalary: salary,
    penalties,
    finalPayable,
    leavesTaken: leaveTaken,
    breakdown,
    alerts: [],
  }
}

/** HOURLY_MIN_DAYS — Muneeb Haneefa C */
async function calcHourlyMinDays(
  contract: IPermanentFacultyContract,
  hoursLogged: number,
  daysWorked: number,
  month: number,
): Promise<Partial<SalaryResult>> {
  const rate = contract.hourlyRate ?? 0
  const baseSalary = hoursLogged * rate
  const isDryMonth = (contract.dryMonths ?? []).includes(month)
  const minDays = isDryMonth
    ? (contract.minDaysDryMonths ?? 10)
    : (contract.minDaysNormal ?? 22)
  const alerts: SalaryAlert[] = []

  if (daysWorked < minDays) {
    alerts.push({
      level: 'WARNING',
      code: 'MIN_DAYS_NOT_MET',
      message: `Worked ${daysWorked} day(s) — minimum required is ${minDays}${isDryMonth ? ' (dry month)' : ''}. HR review needed.`,
    })
  }

  const breakdown: SalaryBreakdown[] = [
    { label: 'Hours Logged', amount: hoursLogged },
    { label: 'Rate per Hour', amount: rate },
    { label: 'Total Pay', amount: baseSalary },
    { label: `Min Days Required (${isDryMonth ? 'Dry Month' : 'Regular'})`, amount: minDays },
    { label: 'Days Worked', amount: daysWorked },
  ]

  return {
    baseSalary,
    finalPayable: baseSalary,
    breakdown,
    alerts,
    status: alerts.some((a) => a.level === 'WARNING') ? 'HR_REVIEW' : undefined,
  }
}

/** FIXED_QUOTA_CARRYFORWARD — Ashraf AC
 *  Pays full fixed salary regardless of hours.
 *  Hour deficit carries forward to next month (written to DB).
 *  Returns three carry-forward numbers: previous, current, combined.
 */
async function calcFixedQuotaCarryForward(
  contract: IPermanentFacultyContract,
  hoursLogged: number,
  month: number,
  year: number,
  facultyId: string,
  facultyName: string,
  fId: Types.ObjectId,
  persist: boolean,
): Promise<Partial<SalaryResult>> {
  const salary = contract.fixedMonthlySalary ?? 0
  const quota = contract.monthlyHourQuota ?? 0
  // Negative means surplus (over-delivery); positive means shortfall
  const currentMonthNet = quota - hoursLogged

  // Load previous month carry-forward
  const prev = prevMonth(month, year)
  const prevRecord = await CarryForwardBalance.findOne({ facultyId: fId, month: prev.month, year: prev.year })
  const previousMonthBalance = prevRecord?.balanceHours ?? 0
  // Surplus (negative net) reduces accumulated deficit; allow negative so credit rolls forward
  const combinedTotal = previousMonthBalance + currentMonthNet
  const currentMonthBalance = Math.max(0, currentMonthNet)

  const alerts: SalaryAlert[] = []
  if (currentMonthBalance > 0) {
    alerts.push({
      level: 'INFO',
      code: 'QUOTA_SHORTFALL',
      message: `${currentMonthBalance.toFixed(1)} hr(s) short of ${quota}h quota this month. Balance carried forward.`,
    })
    if (persist) {
      // Write audit log first — if it throws, the carry-forward record is not
      // committed and the next approval attempt will safely re-calculate.
      await writeAuditLog({
        eventType: 'BALANCE_CARRY_FORWARD',
        facultyId,
        facultyName,
        amount: 0,
        reason: `Hour deficit: ${currentMonthBalance.toFixed(1)} hrs short of ${quota}h quota (previous carry: ${previousMonthBalance.toFixed(1)} hrs)`,
        loggedByUserId: 'SYSTEM',
      })
    }
  }

  // Persist current month balance — ONLY on approval, never on preview, so that
  // repeatedly viewing the calculation doesn't keep overwriting the stored balance.
  if (persist) {
    // Store the running combined total so that next month's previousMonthBalance
    // accumulates correctly across multiple months of shortfall.
    await CarryForwardBalance.findOneAndUpdate(
      { facultyId: fId, month, year },
      { balanceHours: combinedTotal },
      { upsert: true, new: true }
    )
  }

  const breakdown: SalaryBreakdown[] = [
    { label: 'Fixed Monthly Salary', amount: salary },
    { label: 'Monthly Hour Quota', amount: quota },
    { label: 'Hours Logged This Month', amount: hoursLogged },
    { label: 'This Month Deficit', amount: currentMonthBalance },
    { label: 'Previous Month Carry', amount: previousMonthBalance },
    { label: 'Combined Carry-Forward', amount: combinedTotal },
  ]

  return {
    baseSalary: salary,
    finalPayable: salary,
    monthBalance: currentMonthBalance,
    breakdown,
    alerts,
    carryForward: { previousMonthBalance, currentMonthBalance, combinedTotal },
  }
}

/** FIXED_QUOTA_NOCARRY — Anand K
 *  Pays full fixed salary. Displays balance but does NOT write to DB.
 */
async function calcFixedQuotaNoCarry(
  contract: IPermanentFacultyContract,
  hoursLogged: number,
): Promise<Partial<SalaryResult>> {
  const salary = contract.fixedMonthlySalary ?? 0
  const quota = contract.monthlyHourQuota ?? 0
  const monthBalance = Math.max(0, quota - hoursLogged)
  const alerts: SalaryAlert[] = []

  if (monthBalance > 0) {
    alerts.push({
      level: 'INFO',
      code: 'QUOTA_SHORTFALL_DISPLAY',
      message: `${monthBalance.toFixed(1)} hr(s) short of ${quota}h quota this month (display only — does not carry forward).`,
    })
  }

  const breakdown: SalaryBreakdown[] = [
    { label: 'Fixed Monthly Salary', amount: salary },
    { label: 'Monthly Hour Quota', amount: quota },
    { label: 'Hours Logged', amount: hoursLogged },
    { label: 'Month Balance (Display Only)', amount: monthBalance },
  ]

  return {
    baseSalary: salary,
    monthBalance,
    finalPayable: salary,
    breakdown,
    alerts,
  }
}

/** BASE_OVERTIME — Fahim BM */
async function calcBaseOvertime(
  contract: IPermanentFacultyContract,
  hoursLogged: number,
  facultyId: string,
  facultyName: string,
  persist: boolean,
): Promise<Partial<SalaryResult>> {
  const base = contract.fixedMonthlySalary ?? 0
  // Use ONLY overtimeThresholdHours for overtime calculation — monthlyHourQuota
  // is the faculty's required hours target and is semantically unrelated to overtime.
  // Falling back to quota would incorrectly pay overtime from a lower boundary.
  const threshold = contract.overtimeThresholdHours ?? 50
  const rate = contract.overtimeRatePerHour ?? 0
  const overtimeHours = Math.max(0, hoursLogged - threshold)
  const overtimePay = overtimeHours * rate
  const finalPayable = base + overtimePay
  const alerts: SalaryAlert[] = []

  const breakdown: SalaryBreakdown[] = [
    { label: 'Base Salary', amount: base },
    { label: `Hour Quota / Threshold`, amount: threshold },
    { label: 'Hours Logged', amount: hoursLogged },
    { label: 'Overtime Hours', amount: overtimeHours },
    { label: `Overtime Rate (₹${rate}/hr)`, amount: rate },
    { label: 'Overtime Pay', amount: overtimePay },
  ]

  if (overtimeHours > 0) {
    alerts.push({
      level: 'INFO',
      code: 'OVERTIME_EARNED',
      message: `${overtimeHours} overtime hour(s) earned at ${fmt(rate)}/hr = ${fmt(overtimePay)}.`,
    })
    if (persist) {
      await writeAuditLog({
        eventType: 'OVERTIME_ADDED',
        facultyId,
        facultyName,
        amount: overtimePay,
        reason: `${overtimeHours} hrs overtime at ${fmt(rate)}/hr`,
        loggedByUserId: 'SYSTEM',
      })
    }
  }

  return { baseSalary: base, overtimeHours, overtimePay, finalPayable, breakdown, alerts }
}

/** SPLIT_FIXED_VARIABLE — Dr. Dunoonul Shibli
 *  Fixed component is always paid. Variable component is reduced by penalties.
 *  Min 16 days AND min 96 hours — both must be met (WARNING alerts if not).
 */
async function calcSplitFixedVariable(
  contract: IPermanentFacultyContract,
  hoursLogged: number,
  daysWorked: number,
  facultyCancellations: number,
  facultyId: string,
  facultyName: string,
  persist: boolean,
): Promise<Partial<SalaryResult>> {
  const fixed = contract.fixedComponent ?? 0
  const variable = contract.variableComponent ?? 0
  const penaltyPerClass = contract.cancellationPenaltyPerClass ?? 9000
  const minDays = contract.minDaysNormal ?? 16
  const minHours = contract.minHoursRequirement ?? 96

  const penaltyAmount = facultyCancellations * penaltyPerClass
  const effectiveVariable = Math.max(0, variable - penaltyAmount)
  // Report only the penalty actually deducted — the variable component floors at 0,
  // so a raw penaltyAmount larger than `variable` would overstate the deduction.
  const appliedPenalty = Math.min(penaltyAmount, variable)
  const baseSalary = fixed + variable
  const finalPayable = fixed + effectiveVariable
  const alerts: SalaryAlert[] = []

  if (daysWorked < minDays) {
    alerts.push({
      level: 'WARNING',
      code: 'MIN_DAYS_NOT_MET',
      message: `Worked ${daysWorked} day(s) — minimum required is ${minDays}. HR review needed.`,
    })
  }
  if (hoursLogged < minHours) {
    alerts.push({
      level: 'WARNING',
      code: 'MIN_HOURS_NOT_MET',
      message: `Logged ${hoursLogged} hour(s) — minimum required is ${minHours}. HR review needed.`,
    })
  }

  const breakdown: SalaryBreakdown[] = [
    { label: 'Fixed Component', amount: fixed },
    { label: 'Variable Component (before penalty)', amount: variable },
  ]
  if (penaltyAmount > 0) {
    breakdown.push({ label: `Cancellation Penalty (${facultyCancellations} × ${fmt(penaltyPerClass)})`, amount: penaltyAmount, isDeduction: true })
    if (persist) {
      await writeAuditLog({
        eventType: 'PENALTY_APPLIED',
        facultyId,
        facultyName,
        amount: penaltyAmount,
        reason: `${facultyCancellations} class(es) cancelled by faculty × ${fmt(penaltyPerClass)}`,
        loggedByUserId: 'SYSTEM',
      })
    }
  }
  breakdown.push({ label: 'Effective Variable Component', amount: effectiveVariable })
  breakdown.push({ label: 'Total Payable', amount: finalPayable })

  return {
    baseSalary,
    penalties: appliedPenalty,
    finalPayable,
    breakdown,
    alerts,
    status: alerts.some((a) => a.level === 'WARNING') ? 'HR_REVIEW' : undefined,
  }
}

/** CONFIGURABLE — fully custom salary structure configured by HR per faculty */
async function calcConfigurable(
  contract: IPermanentFacultyContract,
  hoursLogged: number,
): Promise<Partial<SalaryResult>> {
  if (!contract.isConfigured) {
    return {
      status: 'PENDING_CONFIG',
      reason: 'Salary structure for this faculty has not been configured yet. Contact HR Manager to set up the pay parameters.',
      alerts: [{
        level: 'BLOCK',
        code: 'PENDING_CONFIG',
        message: 'Pay configuration is incomplete. Payroll cannot be generated.',
      }],
      breakdown: [],
    }
  }

  const cfg = contract.configurablePayJson as Record<string, unknown> | undefined
  const baseAmount = Number(cfg?.baseAmount ?? 0)
  const ratePerHour = Number(cfg?.ratePerHour ?? 0)
  const baseSalary = baseAmount + hoursLogged * ratePerHour

  const breakdown: SalaryBreakdown[] = [
    { label: 'Base Amount', amount: baseAmount },
    { label: 'Hours Logged', amount: hoursLogged },
    { label: `Rate per Hour`, amount: ratePerHour },
    { label: 'Total Pay', amount: baseSalary },
  ]

  return { baseSalary, finalPayable: baseSalary, breakdown, alerts: [] }
}

// ─── Main entry point ──────────────────────────────────────────────────────────

/**
 * @param persist  When true (salary APPROVAL), side-effects run: audit-log rows
 *                 are written and the carry-forward balance is committed to the DB.
 *                 When false (read-only PREVIEW from GET /hr/salary), the calculation
 *                 is pure — no AuditLog spam, no balance overwrites on repeated views.
 */
export async function calculateMonthlySalary(
  facultyId: string,
  month: number,
  year: number,
  persist = false,
): Promise<SalaryResult> {
  if (month < 1 || month > 12) {
    return { status: 'BLOCKED', reason: 'Invalid month: must be 1–12', alerts: [], breakdown: [] }
  }

  // 1. Load faculty
  const faculty = await Faculty.findById(facultyId)
  if (!faculty) {
    return { status: 'BLOCKED', reason: 'Faculty not found', alerts: [], breakdown: [] }
  }

  // 2. Load contract (may not exist for non-permanent / legacy faculty)
  const fId = new Types.ObjectId(facultyId)
  const contract = await PermanentFacultyContract.findOne({ facultyId: fId })

  // 3. Load sessions for the period
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const [sessions, cancellations] = await Promise.all([
    Session.find({ facultyId: fId, sessionDate: { $gte: start, $lt: end }, status: 'COMPLETED' }),
    Session.find({ facultyId: fId, sessionDate: { $gte: start, $lt: end }, status: 'CANCELLED' }),
  ])

  // 4. Global cancellation gate — blank initiator on any cancelled session blocks payroll
  // because we cannot determine whether a penalty applies without knowing the initiator.
  const blankInitiator = cancellations.some((c) => !c.cancellationInitiator)
  if (blankInitiator) {
    return {
      status: 'BLOCKED',
      reason: 'One or more cancelled sessions are missing a cancellation initiator. Payroll blocked until resolved.',
      alerts: [{
        level: 'BLOCK',
        code: 'MISSING_CANCELLATION_INITIATOR',
        message: 'Assign a cancellation initiator (FACULTY / MANAGEMENT / STUDENT) to all cancelled sessions.',
      }],
      breakdown: [],
    }
  }

  // 5. Aggregate session data
  const hoursLogged = sessions.reduce((s, r) => s + r.durationHours, 0)
  const daysWorked = new Set(sessions.map((s) => s.sessionDate.toDateString())).size
  // Weekday-only count: used for leave-based contracts where workingDays is Mon–Fri
  const weekdayDaysWorked = new Set(
    sessions
      .filter((s) => { const d = s.sessionDate.getDay(); return d !== 0 && d !== 6 })
      .map((s) => s.sessionDate.toDateString()),
  ).size
  const facultyCancellations = cancellations.filter((c) => c.cancellationInitiator === 'FACULTY').length

  // 6. Dispatch to contract-type handler
  let partial: Partial<SalaryResult> = {}

  if (!contract) {
    // Fallback for faculty without a PermanentFacultyContract (legacy / non-permanent)
    partial = await calcLegacyFallback(faculty, hoursLogged, daysWorked, facultyCancellations, month, year, facultyId)
  } else {
    switch (contract.contractType) {
      case 'HOURLY':
        partial = await calcHourly(contract, hoursLogged)
        break
      case 'FIXED_MONTHLY_MIN_DAYS':
        partial = await calcFixedMonthlyMinDays(contract, daysWorked)
        break
      case 'FIXED_MONTHLY_LEAVE':
        partial = await calcFixedMonthlyLeave(contract, weekdayDaysWorked, month, year, faculty.name, facultyId, persist)
        break
      case 'HOURLY_MIN_DAYS':
        partial = await calcHourlyMinDays(contract, hoursLogged, daysWorked, month)
        break
      case 'FIXED_QUOTA_CARRYFORWARD':
        partial = await calcFixedQuotaCarryForward(contract, hoursLogged, month, year, facultyId, faculty.name, fId, persist)
        break
      case 'FIXED_QUOTA_NOCARRY':
        partial = await calcFixedQuotaNoCarry(contract, hoursLogged)
        break
      case 'BASE_OVERTIME':
        partial = await calcBaseOvertime(contract, hoursLogged, facultyId, faculty.name, persist)
        break
      case 'SPLIT_FIXED_VARIABLE':
        partial = await calcSplitFixedVariable(contract, hoursLogged, daysWorked, facultyCancellations, facultyId, faculty.name, persist)
        break
      case 'CONFIGURABLE':
        partial = await calcConfigurable(contract, hoursLogged)
        break
    }
  }

  // 7. Merge with common fields and determine final status
  const alerts = partial.alerts ?? []
  const hasBlock = alerts.some((a) => a.level === 'BLOCK')
  const hasWarning = alerts.some((a) => a.level === 'WARNING')

  const status = partial.status
    ?? (hasBlock ? 'BLOCKED' : hasWarning ? 'HR_REVIEW' : 'OK')

  return {
    status,
    reason: partial.reason,
    hoursLogged,
    daysWorked,
    leavesTaken: partial.leavesTaken,
    baseSalary: partial.baseSalary,
    overtimeHours: partial.overtimeHours,
    overtimePay: partial.overtimePay,
    penalties: partial.penalties,
    monthBalance: partial.monthBalance,
    finalPayable: partial.finalPayable,
    alerts,
    breakdown: partial.breakdown ?? [],
    carryForward: partial.carryForward,
  }
}

// ─── Legacy fallback (faculty without a PermanentFacultyContract) ──────────────
// Kept for backward compatibility; all permanent faculty have contracts after seeding.

async function calcLegacyFallback(
  faculty: IFaculty,
  hoursLogged: number,
  daysWorked: number,
  facultyCancellations: number,
  month: number,
  year: number,
  facultyId: string,
): Promise<Partial<SalaryResult>> {
  let baseSalary = 0, penalties = 0, monthBalance = 0
  const overtimePay = 0, overtimeHours = 0
  const alerts: SalaryAlert[] = []
  const breakdown: SalaryBreakdown[] = []

  switch (faculty.salaryModel) {
    case 'HOURLY': {
      const rate = faculty.hourlyRate ?? 0
      baseSalary = hoursLogged * rate
      breakdown.push({ label: 'Hours Logged', amount: hoursLogged })
      breakdown.push({ label: 'Rate per Hour', amount: rate })
      breakdown.push({ label: 'Total Pay', amount: baseSalary })
      break
    }
    case 'FIXED_MONTHLY': {
      baseSalary = faculty.fixedMonthlySalary ?? 0
      breakdown.push({ label: 'Fixed Monthly Salary', amount: baseSalary })
      break
    }
    case 'FIXED_WITH_QUOTA': {
      baseSalary = faculty.fixedMonthlySalary ?? 0
      monthBalance = Math.max(0, (faculty.monthlyHourQuota ?? 0) - hoursLogged)
      breakdown.push({ label: 'Fixed Monthly Salary', amount: baseSalary })
      breakdown.push({ label: 'Month Balance', amount: monthBalance })
      break
    }
    case 'SPLIT_FIXED_VARIABLE': {
      const fixed = faculty.fixedComponent ?? 0
      const variable = faculty.variableComponent ?? 0
      const penaltyPerClass = 9000
      // Cap penalties at the variable component so finalPayable never goes below fixed.
      penalties = Math.min(facultyCancellations * penaltyPerClass, variable)
      baseSalary = fixed + variable  // pre-penalty; finalPayable = baseSalary - penalties in the shared return
      breakdown.push({ label: 'Fixed Component', amount: fixed })
      breakdown.push({ label: 'Variable Component', amount: variable })
      if (penalties > 0) breakdown.push({ label: 'Cancellation Penalty', amount: penalties, isDeduction: true })
      breakdown.push({ label: 'Total Payable', amount: fixed + variable - penalties })
      break
    }
    case 'CONFIGURABLE': {
      const cfg = faculty.configurablePayJson as Record<string, unknown> | undefined
      baseSalary = Number(cfg?.baseAmount ?? 0) + hoursLogged * Number(cfg?.ratePerHour ?? 0)
      breakdown.push({ label: 'Configurable Pay', amount: baseSalary })
      break
    }
  }

  return {
    baseSalary, overtimeHours, overtimePay, penalties, monthBalance,
    finalPayable: baseSalary + overtimePay - penalties,
    alerts,
    breakdown,
  }
}
