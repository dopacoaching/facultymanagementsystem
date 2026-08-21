import { apiFetch } from './api'

export interface Campus {
  _id:      string
  name:     string
  location?: string
}

export async function getCampuses(token: string): Promise<Campus[]> {
  return apiFetch<Campus[]>('/hr/campuses', { token })
}
