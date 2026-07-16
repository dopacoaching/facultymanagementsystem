export type Subject =
  | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY'
  | 'BOTANY'  | 'ZOOLOGY'
  | 'MATHS'
  | 'ENGLISH' | 'MALAYALAM' | 'ARABIC'

export const SUBJECTS: Subject[] = [
  'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'BOTANY', 'ZOOLOGY',
  'MATHS', 'ENGLISH', 'MALAYALAM', 'ARABIC',
]

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

export type AuditCategory = 'HR' | 'ACADEMICS' | 'IG' | 'ADMIN' | 'AUTH'

export type AuditEventType =
  // ── HR / Salary ───────────────────────────────────────────────────────────
  | 'FACULTY_CREATED'
  | 'FACULTY_UPDATED'
  | 'PAY_CONFIG_UPDATED'
  | 'SALARY_APPROVED'
  | 'SALARY_FIELD_CHANGED'
  | 'PENALTY_APPLIED'
  | 'OVERTIME_ADDED'
  | 'BALANCE_CARRY_FORWARD'
  // ── Academics (Repeaters) ─────────────────────────────────────────────────
  | 'SESSION_LOGGED'
  | 'SESSION_UPDATED'
  | 'SESSION_STATUS_CHANGED'
  | 'SESSION_CANCELLED'
  | 'CHAPTER_UPDATED'
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_UPDATED'
  | 'SCHEDULE_PUBLISHED'
  | 'SCHEDULE_REVISED'
  | 'SCHEDULE_DELETED'
  // ── Integrated School ─────────────────────────────────────────────────────
  | 'IG_SESSION_LOGGED'
  | 'IG_SESSION_STATUS_CHANGED'
  | 'IG_SESSION_CANCELLED'
  | 'IG_CHAPTER_UPDATED'
  | 'IG_TIMETABLE_ASSIGNED'
  | 'IG_TIMETABLE_UPDATED'
  | 'IG_TIMETABLE_DELETED'
  | 'SPECIAL_DAY_ADDED'
  | 'SPECIAL_DAY_DELETED'
  // ── Admin ─────────────────────────────────────────────────────────────────
  | 'USER_ACCOUNT_CREATED'
  | 'USER_ACCOUNT_UPDATED'
  // ── Auth ──────────────────────────────────────────────────────────────────
  | 'USER_LOGGED_IN'
  | 'USER_LOGGED_OUT'
  | 'PASSWORD_CHANGED'

export interface JWTPayload {
  userId: string
  role: UserRole
  facultyId?: string
  batchId?: string
  /** Restricts ACADEMICS_MANAGER to a single batch type (RESIDENTIAL | OFFLINE | ONLINE) */
  batchType?: string
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
