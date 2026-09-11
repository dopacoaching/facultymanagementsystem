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

export interface RangeAvailability {
  from: string
  to: string
  faculty: FacultyAvailabilityGroup[]
}

/** GET availability for one faculty within a date range */
export async function getAvailability(
  facultyId: string,
  from: string,
  to: string,
  token: string
): Promise<AvailabilityEntry[]> {
  return apiFetch<AvailabilityEntry[]>(
    `/academics/availability?facultyId=${facultyId}&from=${from}&to=${to}`,
    { token }
  )
}

/** GET all faculty availability entries within a date range (grouped) */
export async function getAllAvailabilityForMonth(
  from: string,
  to: string,
  token: string
): Promise<RangeAvailability> {
  return apiFetch<RangeAvailability>(
    `/academics/availability/all?from=${from}&to=${to}`,
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
