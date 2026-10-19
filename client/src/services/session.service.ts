import { apiFetch } from './api'
import type { Session } from '@/types'

export interface SessionFilters {
  facultyId?: string
  batchId?: string
  campusName?: string
  from?: string
  to?: string
}

export async function getAll(filters: SessionFilters, token: string): Promise<Session[]> {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    )
  ).toString()
  return apiFetch<Session[]>(`/academics/sessions${qs ? `?${qs}` : ''}`, { token })
}

export async function create(
  data: {
    batchId: string
    subject: string
    chapter: string
    chapters?: string[]
    syllabusChapterId?: string
    startTime?: string
    /** Required by the API — requests without a positive duration are rejected. */
    durationHours: number
    sessionDate: string
    facultyId: string
    sessionCategory?: 'CLASS' | 'DOUBT_CLEARANCE'
  },
  token: string
): Promise<Session> {
  return apiFetch<Session>('/academics/sessions', { method: 'POST', body: data, token })
}

export async function update(
  sessionId: string,
  data: Partial<{
    entryType: 'LIVE' | 'SHOOT'
    facultyId: string
    subject: string
    chapter: string
    classMode: 'ONLINE' | 'OFFLINE' | 'ONLINE_DOUBT_CLEARANCE' | 'OFFLINE_DOUBT_CLEARANCE'
    updatedByName: string
    comment: string
    startTime: string
    endTime: string
    breakMinutes: number
    lunchBreakMinutes: number
    afternoonBreakMinutes: number
    durationHours: number
    sessionDate: string
    batchIds: string[]
  }>,
  token: string
): Promise<Session> {
  return apiFetch<Session>(`/academics/sessions/${sessionId}`, { method: 'PATCH', body: data, token })
}

export async function cancel(
  sessionId: string,
  cancellationInitiator: string,
  token: string
): Promise<void> {
  await apiFetch('/academics/sessions/cancel', {
    method: 'POST',
    body: { sessionId, cancellationInitiator },
    token,
  })
}

export async function remove(sessionId: string, token: string): Promise<void> {
  await apiFetch(`/academics/sessions/${sessionId}`, { method: 'DELETE', token })
}
