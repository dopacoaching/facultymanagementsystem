import { apiFetch } from './api'
import type { Faculty } from '@/types'

export interface Batch {
  _id: string
  name: string
  type: string
  campusId: string
  ig1Subgroup?: string
}

export async function getAll(token: string, includeInactive = false): Promise<Faculty[]> {
  const qs = includeInactive ? '?includeInactive=true' : ''
  return apiFetch<Faculty[]>(`/hr/faculty${qs}`, { token })
}

export async function getById(id: string, token: string): Promise<Faculty> {
  return apiFetch<Faculty>(`/hr/faculty/${id}`, { token })
}

export async function create(data: Omit<Faculty, '_id'>, token: string): Promise<Faculty> {
  return apiFetch<Faculty>('/hr/faculty', { method: 'POST', body: data, token })
}

export async function update(id: string, data: Partial<Faculty>, token: string): Promise<Faculty> {
  return apiFetch<Faculty>(`/hr/faculty/${id}`, { method: 'PATCH', body: data, token })
}

export async function getBatches(token: string): Promise<Batch[]> {
  return apiFetch<Batch[]>('/hr/batches', { token })
}
