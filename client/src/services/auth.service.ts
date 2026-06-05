import { apiFetch } from './api'

export interface LoginResponse {
  accessToken: string
  role: string
  userId: string
  facultyId?: string
  batchId?: string
  batchType?: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: { username, password } })
}

export async function logout(token?: string): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST', token })
}

export async function refresh(): Promise<{ accessToken: string }> {
  return apiFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  token: string,
  targetUserId?: string,
): Promise<void> {
  await apiFetch('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword, ...(targetUserId ? { userId: targetUserId } : {}) },
    token,
  })
}
