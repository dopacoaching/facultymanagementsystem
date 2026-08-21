import { apiFetch } from './api'
import type { Session } from '@/types'

export interface IGSessionFilters {
  facultyId?: string
  batchId?: string
  month?: number
  year?: number
}

export async function getAll(filters: IGSessionFilters, token: string): Promise<Session[]> {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    )
  ).toString()
  return apiFetch<Session[]>(`/ig/sessions${qs ? `?${qs}` : ''}`, { token })
}

export async function create(
  data: {
    facultyId: string
    batchId: string
    subject: string
    chapter: string
    timeSlot: string
    scheduledTime?: string
    startTime: string
    endTime: string
    breakMinutes: number
    updatedByName: string
    durationHours: number
    sessionDate: string
  },
  token: string
): Promise<Session> {
  return apiFetch<Session>('/ig/sessions', { method: 'POST', body: data, token })
}

export async function update(
  sessionId: string,
  data: Partial<{
    facultyId: string
    batchId: string
    subject: string
    chapter: string
    timeSlot: string
    scheduledTime: string
    updatedByName: string
    startTime: string
    endTime: string
    breakMinutes: number
    durationHours: number
    sessionDate: string
  }>,
  token: string
): Promise<Session> {
  return apiFetch<Session>(`/ig/sessions/${sessionId}`, { method: 'PATCH', body: data, token })
}

export async function cancel(
  sessionId: string,
  cancellationInitiator: string,
  token: string
): Promise<void> {
  await apiFetch('/ig/sessions/cancel', {
    method: 'POST',
    body: { sessionId, cancellationInitiator },
    token,
  })
}
