import { apiFetch } from './api'

export interface SetupTeacher { name: string; isActive: boolean }

export interface SetupCampus {
  _id: string
  name: string
  kind: 'CAMPUS' | 'IG'
  isActive: boolean
  teachers: SetupTeacher[]
  hasBatches: boolean
  batchCampusId: string | null
  batchCount: number
  login: { _id: string; username: string; isActive: boolean } | null
}

export const getCampuses = (token: string) => apiFetch<SetupCampus[]>('/hr/setup/campuses', { token })

export const createCampus = (
  data: { name: string; kind: 'CAMPUS' | 'IG'; hasBatches: boolean; location?: string; teachers: string[]; username: string; password: string },
  token: string,
) => apiFetch<SetupCampus>('/hr/setup/campuses', { method: 'POST', body: data, token })

export const updateCampus = (
  id: string,
  data: Partial<{ name: string; isActive: boolean; hasBatches: boolean; username: string; password: string }>,
  token: string,
) => apiFetch<SetupCampus>(`/hr/setup/campuses/${id}`, { method: 'PATCH', body: data, token })

export const addTeacher = (campusId: string, name: string, token: string) =>
  apiFetch<{ teachers: SetupTeacher[] }>(`/hr/setup/campuses/${campusId}/teachers`, { method: 'POST', body: { name }, token })

export const updateTeacher = (
  campusId: string,
  name: string,
  data: { newName?: string; isActive?: boolean },
  token: string,
) => apiFetch<{ teachers: SetupTeacher[] }>(`/hr/setup/campuses/${campusId}/teachers`, { method: 'PATCH', body: { name, ...data }, token })

// ── Batches ─────────────────────────────────────────────────────────────────

export type BatchType = 'RESIDENTIAL' | 'OFFLINE' | 'ONLINE' | 'IG'

export interface SetupBatch {
  _id: string
  name: string
  type: BatchType
  isActive: boolean
  stream?: 'NEET' | 'JEE'
  ig1Subgroup?: 'PLUS_ONE' | 'PLUS_TWO'
  campusId: { _id: string; name: string } | null
}

export interface BatchCampusOption { _id: string; name: string }

export const getBatches = (token: string) =>
  apiFetch<{ batches: SetupBatch[]; campuses: BatchCampusOption[] }>('/hr/setup/batches', { token })

export const createBatch = (
  data: { name: string; type: BatchType; campusId: string; stream?: string; ig1Subgroup?: string },
  token: string,
) => apiFetch<SetupBatch>('/hr/setup/batches', { method: 'POST', body: data, token })

export const updateBatch = (
  id: string,
  data: Partial<{ name: string; isActive: boolean; type: BatchType; campusId: string; stream: string; ig1Subgroup: string }>,
  token: string,
) => apiFetch<SetupBatch>(`/hr/setup/batches/${id}`, { method: 'PATCH', body: data, token })
