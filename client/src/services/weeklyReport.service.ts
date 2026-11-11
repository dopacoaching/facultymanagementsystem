import { apiFetch } from './api'

export interface WeeklyReportRow {
  facultyId: string
  name: string
  phone: string
  /** False when the faculty has no phone number, or one WhatsApp can't use. */
  canSend: boolean
  sessionCount: number
  totalHours: number
  summary: string
}

export interface WeeklyReportPreview {
  from: string
  to: string
  /** False until the WhatsApp credentials are set on the server. */
  configured: boolean
  faculty: WeeklyReportRow[]
}

export interface WeeklySendResult {
  facultyId: string
  name: string
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  error?: string
}

export function getWeeklyPreview(from: string, to: string, token: string): Promise<WeeklyReportPreview> {
  return apiFetch<WeeklyReportPreview>(`/hr/reports/temporary-weekly?from=${from}&to=${to}`, { token })
}

export function sendWeeklyReports(
  data: { from: string; to: string; facultyIds: string[] }, token: string,
): Promise<{ results: WeeklySendResult[] }> {
  return apiFetch<{ results: WeeklySendResult[] }>('/hr/reports/temporary-weekly', { method: 'POST', body: data, token })
}
