import { apiFetch } from './api'

export interface EntryRow {
  _id: string
  /** YYYY-MM-DD */
  date: string
  campusName: string
  facultyId: string
  facultyName: string
  facultyType: string
  subject: string
  chapter: string
  classMode: string
  startTime: string
  endTime: string
  durationHours: number
  updatedByName: string
  batchName: string
  breakMinutes: number | null
  lunchBreakMinutes: number | null
  afternoonBreakMinutes: number | null
}

export interface NoClassRow {
  _id: string
  campusName: string
  date: string
  reason: string
}

export interface EntriesReport {
  from: string
  to: string
  campuses: string[]
  sessions: EntryRow[]
  noClass: NoClassRow[]
  /** Past days with no entry and no No Class marker, per campus. */
  missing: { campusName: string; dates: string[] }[]
  truncated: boolean
}

export function getEntriesReport(from: string, to: string, token: string): Promise<EntriesReport> {
  return apiFetch<EntriesReport>(`/hr/reports/entries?from=${from}&to=${to}`, { token })
}

export interface NoClassDoc {
  _id: string
  campusName: string
  date: string
  reason?: string
}

export function markNoClass(
  data: { date: string; reason?: string; markedByName?: string; campusName?: string },
  token: string,
): Promise<NoClassDoc> {
  return apiFetch<NoClassDoc>('/academics/no-class', { method: 'POST', body: data, token })
}

export function listNoClass(from: string, to: string, token: string): Promise<NoClassDoc[]> {
  return apiFetch<NoClassDoc[]>(`/academics/no-class?from=${from}&to=${to}`, { token })
}

export function removeNoClass(id: string, token: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/academics/no-class?id=${id}`, { method: 'DELETE', token })
}
