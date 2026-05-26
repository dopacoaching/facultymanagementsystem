export type UserRole =
  | 'ADMIN'
  | 'HR_MANAGER'
  | 'ACADEMICS_MANAGER'
  | 'IS_ACADEMICS_MANAGER'
  | 'COORDINATOR'
  | 'FACULTY'
  | 'IS_COORDINATOR'

export interface Faculty {
  _id: string
  name: string
  subject: string
  type: string
  salaryModel: string
  isActive: boolean
  hourlyRate?: number
  fixedMonthlySalary?: number
  monthlyHourQuota?: number
  monthlyDayQuota?: number
  overtimeThreshold?: number
  overtimeRate?: number
  fixedComponent?: number
  variableComponent?: number
  monthlyLeaveAllowance?: number
  aprilLeaveAllowance?: number
  configurablePayJson?: Record<string, unknown>
}

export interface Session {
  _id: string
  facultyId: { _id: string; name: string; subject: string } | string
  batchId: string
  subject: string
  chapter: string
  durationHours: number
  sessionDate: string
  status: string
  cancellationInitiator?: string
}

// ── Salary result types ────────────────────────────────────────────────────

export interface SalaryAlert {
  level: 'INFO' | 'WARNING' | 'BLOCK'
  code: string
  message: string
}

export interface SalaryBreakdown {
  label: string
  amount: number
  isDeduction?: boolean
}

export interface SalaryCarryForward {
  previousMonthBalance: number
  currentMonthBalance: number
  combinedTotal: number
}

export interface SalaryResult {
  status: 'OK' | 'BLOCKED' | 'PENDING_CONFIG' | 'HR_REVIEW'
  reason?: string
  hoursLogged?: number
  daysWorked?: number
  leavesTaken?: number
  baseSalary?: number
  overtimePay?: number
  overtimeHours?: number
  penalties?: number
  monthBalance?: number
  finalPayable?: number
  alerts: SalaryAlert[]
  breakdown: SalaryBreakdown[]
  carryForward?: SalaryCarryForward
}

export interface AuditLog {
  _id: string
  referenceNumber: string
  eventType: string
  facultyName: string
  amount: number
  reason: string
  timestamp: string
}
