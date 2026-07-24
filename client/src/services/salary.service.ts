import { apiFetch } from './api'
import type { SalaryResult, AuditLog } from '@/types'

export interface AuditLogPage {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
}

export interface SalaryReport {
  _id: string
  facultyId: string
  name: string
  subject: string
  month: number
  year: number
  hoursLogged: number
  daysWorked: number
  baseSalary: number
  overtimePay: number
  penaltiesApplied: number
  finalPayable: number
  status: string
  approvedAt: string
}

export async function calculate(
  facultyId: string,
  month: number,
  year: number,
  token: string
): Promise<SalaryResult> {
  return apiFetch<SalaryResult>(
    `/hr/salary?facultyId=${facultyId}&month=${month}&year=${year}`,
    { token }
  )
}

export async function approve(
  facultyId: string,
  month: number,
  year: number,
  token: string
): Promise<void> {
  await apiFetch('/hr/salary/approve', { method: 'POST', body: { facultyId, month, year }, token })
}

export async function getAuditLog(
  token: string,
  page = 1,
  limit = 20,
  facultyId?: string
): Promise<AuditLogPage> {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (facultyId) qs.set('facultyId', facultyId)
  return apiFetch<AuditLogPage>(`/hr/audit-log?${qs}`, { token })
}

export async function getReports(
  month: number,
  year: number,
  token: string
): Promise<SalaryReport[]> {
  return apiFetch<SalaryReport[]>(`/hr/salary/reports?month=${month}&year=${year}`, { token })
}

export interface SalaryHistoryRecord {
  _id: string
  month: number
  year: number
  finalPayable: number
  hoursLogged?: number
  daysWorked?: number
  baseSalary?: number
  penaltiesApplied?: number
  status: string
  approvedAt: string
}

export async function getMyHistory(token: string): Promise<SalaryHistoryRecord[]> {
  return apiFetch<SalaryHistoryRecord[]>('/hr/salary/history', { token })
}

export interface MonthlyHoursSummary {
  year: number
  month: number
  totalHours: number
  sessionCount: number
}

export interface HoursSummaryResponse {
  months: MonthlyHoursSummary[]
  allTimeTotalHours: number
  allTimeSessionCount: number
}

export async function getMyHoursSummary(token: string): Promise<HoursSummaryResponse> {
  return apiFetch<HoursSummaryResponse>('/hr/salary/my-hours-summary', { token })
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface HoursProgressItem {
  facultyId: string
  name: string
  subject: string
  contractType: string
  quota: number
  logged: number
  pct: number
  deficit: number
  surplus: number
  status: 'MET' | 'ON_TRACK' | 'AT_RISK' | 'MISSED'
}

export interface PayrollStatusItem {
  facultyId: string
  name: string
  subject: string
  salaryModel: string
  status: 'APPROVED' | 'PENDING' | 'BLOCKED'
  finalPayable: number | null
  penaltiesApplied: number | null
  overtimePay: number | null
}

export interface CancellationLogItem {
  sessionId: string
  facultyName: string
  subject: string
  chapter: string
  sessionDate: string
  durationHours: number
  cancellationInitiator: string
}

export interface DashboardData {
  month: number
  year: number
  hoursProgress: HoursProgressItem[]
  payrollStatus: PayrollStatusItem[]
  cancellationLog: CancellationLogItem[]
  totals: {
    totalPenalties: number
    totalOvertimePay: number
    totalOvertimeHours: number
    totalPayroll: number
    approved: number
    pending: number
    blocked: number
    totalFaculty: number
  }
}

export async function getDashboard(month: number, year: number, token: string): Promise<DashboardData> {
  return apiFetch<DashboardData>(`/hr/dashboard?month=${month}&year=${year}`, { token })
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export interface FacultyContract {
  _id: string
  facultyId: string
  contractType: string
  hourlyRate?: number
  fixedMonthlySalary?: number
  monthlyHourQuota?: number
  hasCarryForward: boolean
  minDaysNormal?: number
  minDaysDryMonths?: number
  dryMonths?: number[]
  monthlyLeaveAllowance?: number
  aprilLeaveAllowance?: number
  overtimeThresholdHours?: number
  overtimeRatePerHour?: number
  fixedComponent?: number
  variableComponent?: number
  cancellationPenaltyPerClass?: number
  minHoursRequirement?: number
  shortfallRatePerHour?: number
  classRatePerHour?: number
  isConfigured: boolean
  configurablePayJson?: Record<string, unknown>
  notes?: string
}

export async function getContract(facultyId: string, token: string): Promise<FacultyContract> {
  return apiFetch<FacultyContract>(`/hr/contract/${facultyId}`, { token })
}

export async function updateContract(facultyId: string, data: Partial<FacultyContract>, token: string): Promise<FacultyContract> {
  return apiFetch<FacultyContract>(`/hr/contract/${facultyId}`, { method: 'PATCH', body: data, token })
}

// ─── Payable Days (OFFICE_STAFF_LEAVE_BASED) ─────────────────────────────────

export async function setPayableDays(
  facultyId: string,
  month: number,
  year: number,
  payableDays: number,
  token: string
): Promise<void> {
  await apiFetch('/hr/salary/payable-days', {
    method: 'POST',
    body: { facultyId, month, year, payableDays },
    token,
  })
}
