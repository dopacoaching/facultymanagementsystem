export type Subject = 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY' | 'MATHS' | 'ENGLISH' | 'MALAYALAM'

export const SUBJECTS: Subject[] = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'MATHS', 'ENGLISH', 'MALAYALAM']

export type UserRole =
  | 'ADMIN'
  | 'HR_MANAGER'
  | 'ACADEMICS_MANAGER'
  | 'IG_ACADEMICS_MANAGER'
  | 'COORDINATOR'
  | 'FACULTY'
  | 'IG_COORDINATOR'

export type FacultyType = 'PERMANENT' | 'TEMPORARY' | 'REGULAR' | 'VISITING' | 'CONTRACTUAL'

export type SalaryModel =
  | 'FIXED_MONTHLY'
  | 'HOURLY'
  | 'FIXED_WITH_QUOTA'
  | 'SPLIT_FIXED_VARIABLE'
  | 'CONFIGURABLE'

export type ContractType =
  | 'HOURLY'
  | 'FIXED_MONTHLY_MIN_DAYS'
  | 'FIXED_MONTHLY_LEAVE'
  | 'HOURLY_MIN_DAYS'
  | 'FIXED_QUOTA_CARRYFORWARD'
  | 'FIXED_QUOTA_NOCARRY'
  | 'BASE_OVERTIME'
  | 'SPLIT_FIXED_VARIABLE'
  | 'CONFIGURABLE'

export type BatchType = 'RESIDENTIAL' | 'OFFLINE' | 'ONLINE' | 'IG'

export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NOT_COMPLETED'

export type CancellationInitiator = 'FACULTY' | 'MANAGEMENT' | 'STUDENT'

export type PayrollStatus = 'PENDING' | 'APPROVED' | 'BLOCKED'

export type AuditEventType =
  | 'PENALTY_APPLIED'
  | 'OVERTIME_ADDED'
  | 'BALANCE_CARRY_FORWARD'
  | 'SALARY_APPROVED'
  | 'PAY_CONFIG_UPDATED'
  | 'SALARY_FIELD_CHANGED'
  | 'SESSION_CANCELLED'
  | 'FACULTY_CREATED'
  | 'FACULTY_UPDATED'

export interface JWTPayload {
  userId: string
  role: UserRole
  facultyId?: string
  batchId?: string
  /** Unix timestamp (ms) of the last verified request — used for inactivity timeout */
  lastActive?: number
}

// ── Salary result sub-types ────────────────────────────────────────────────

export interface SalaryAlert {
  /** INFO = informational only, WARNING = needs HR attention, BLOCK = payroll blocked */
  level: 'INFO' | 'WARNING' | 'BLOCK'
  code: string
  message: string
}

export interface SalaryBreakdown {
  label: string
  /** Raw number — callers format as currency or hours depending on context */
  amount: number
  /** true → this line reduces the total (displayed in red) */
  isDeduction?: boolean
}

export interface SalaryCarryForward {
  /** Balance carried in from the previous month */
  previousMonthBalance: number
  /** Deficit accumulated in the current month */
  currentMonthBalance: number
  /** Combined total (previous + current) */
  combinedTotal: number
}

export interface SalaryResult {
  /**
   * OK             — calculation succeeded, finalPayable is ready
   * BLOCKED        — payroll cannot proceed (e.g. missing cancellation initiator)
   * PENDING_CONFIG — faculty has a CONFIGURABLE contract that has not been set up yet
   * HR_REVIEW      — calculation succeeded but one or more WARNING/BLOCK alerts require HR review
   */
  status: 'OK' | 'BLOCKED' | 'PENDING_CONFIG' | 'HR_REVIEW'
  reason?: string

  // Core metrics
  hoursLogged?: number
  daysWorked?: number
  leavesTaken?: number   // FIXED_MONTHLY_LEAVE contracts only

  // Salary components
  baseSalary?: number
  overtimeHours?: number
  overtimePay?: number
  penalties?: number
  monthBalance?: number
  finalPayable?: number

  // Rich output
  alerts: SalaryAlert[]
  breakdown: SalaryBreakdown[]

  // Ashraf AC — carry-forward display (three separate numbers)
  carryForward?: SalaryCarryForward
}
