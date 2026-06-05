import { apiFetch } from './api'

export type AvailabilityStatus = 'AVAILABLE' | 'RESCHEDULED' | 'CANCELLED'

export interface AvailabilityEntry {
  _id: string
  facultyId: string
  date: string
  status: AvailabilityStatus
  remark?: string
  loggedByUserId: string
  createdAt: string
  updatedAt: string
}

export interface FacultyAvailabilityGroup {
  facultyId: string
  name: string
  subject: string
  entries: AvailabilityEntry[]
}

export interface MonthAvailability {
  month: number
  year: number
  faculty: FacultyAvailabilityGroup[]
}

/** GET availability for one faculty for a given month */
export async function getAvailability(
  facultyId: string,
  month: number,
  year: number,
  token: string
): Promise<AvailabilityEntry[]> {
  return apiFetch<AvailabilityEntry[]>(
    `/academics/availability?facultyId=${facultyId}&month=${month}&year=${year}`,
    { token }
  )
}

/** GET all faculty availability entries for a month (grouped) */
export async function getAllAvailabilityForMonth(
  month: number,
  year: number,
  token: string
): Promise<MonthAvailability> {
  return apiFetch<MonthAvailability>(
    `/academics/availability/all?month=${month}&year=${year}`,
    { token }
  )
}

/** POST — add available dates for a faculty */
export async function addAvailabilityDates(
  facultyId: string,
  dates: string[],
  token: string
): Promise<AvailabilityEntry[]> {
  return apiFetch<AvailabilityEntry[]>('/academics/availability', {
    method: 'POST',
    body: { facultyId, dates },
    token,
  })
}

/** PATCH — update status + remark (reschedule or cancel a date) */
export async function updateAvailabilityEntry(
  id: string,
  status: AvailabilityStatus,
  remark: string,
  token: string
): Promise<AvailabilityEntry> {
  return apiFetch<AvailabilityEntry>(`/academics/availability/${id}`, {
    method: 'PATCH',
    body: { status, remark },
    token,
  })
}

/** DELETE — remove an availability entry */
export async function deleteAvailabilityEntry(id: string, token: string): Promise<void> {
  await apiFetch(`/academics/availability/${id}`, { method: 'DELETE', token })
}
