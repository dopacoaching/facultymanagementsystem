import { apiFetch } from './api'
import type { UserRole } from '@/types'

export interface AppUser {
  _id: string
  username: string
  role: UserRole
  isActive: boolean
  facultyId?: { _id: string; name: string } | null
  batchId?: { _id: string; name: string } | null
  batchType?: string | null
  createdAt?: string
}

export interface CreateUserPayload {
  username: string
  password: string
  role: UserRole
  facultyId?: string
  batchId?: string
  batchType?: string
}

export interface UpdateUserPayload {
  isActive?: boolean
  role?: UserRole
  batchId?: string | null
  batchType?: string | null
  password?: string
}

export async function getUsers(token: string): Promise<AppUser[]> {
  return apiFetch<AppUser[]>('/admin/users', { token })
}

export async function createUser(data: CreateUserPayload, token: string): Promise<AppUser> {
  return apiFetch<AppUser>('/admin/users', { method: 'POST', body: data, token })
}

export async function updateUser(id: string, data: UpdateUserPayload, token: string): Promise<AppUser> {
  return apiFetch<AppUser>(`/admin/users/${id}`, { method: 'PATCH', body: data, token })
}
