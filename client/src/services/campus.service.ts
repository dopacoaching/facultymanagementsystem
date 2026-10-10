import { apiFetch } from './api'

export interface Campus {
  _id:      string
  name:     string
  location?: string
}

export interface MyCampus {
  name: string
  kind: 'CAMPUS' | 'IG'
  /** Active teacher names for the "Updated by" / "Marked by" dropdowns. */
  teachers: string[]
  /** Campus whose batches this login picks from; null when it has no batches. */
  batchCampusId: string | null
}

export async function getMyCampus(token: string): Promise<MyCampus> {
  return apiFetch<MyCampus>('/academics/my-campus', { token })
}

export async function getCampuses(token: string): Promise<Campus[]> {
  return apiFetch<Campus[]>('/hr/campuses', { token })
}
