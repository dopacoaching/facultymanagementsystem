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
