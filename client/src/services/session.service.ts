import { apiFetch } from './api'
import type { Session } from '@/types'

export interface SessionFilters {
  facultyId?: string
  batchId?: string
  month?: number
  year?: number
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
    durationHours: number
    sessionDate: string
    facultyId?: string
  },
  token: string
): Promise<Session> {
  return apiFetch<Session>('/academics/sessions', { method: 'POST', body: data, token })
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
