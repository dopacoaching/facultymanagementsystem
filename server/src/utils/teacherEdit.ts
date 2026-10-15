/**
 * Class teachers (campus + IG logins) may correct an entry they pushed for a
 * limited time after submitting it; after that only HR/Admin can edit.
 * Mirrors client/src/lib/utils/teacherEdit.ts — keep the two in sync.
 */
export const TEACHER_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

/** Fields a teacher may change — never the faculty, batch or campus. */
export const TEACHER_EDITABLE_FIELDS = [
  'classMode', 'subject', 'chapter', 'updatedByName', 'startTime', 'endTime',
  'breakMinutes', 'lunchBreakMinutes', 'afternoonBreakMinutes', 'durationHours', 'sessionDate',
] as const

/** Milliseconds left in the teacher's edit window (<= 0 once closed). */
export function editWindowRemainingMs(createdAt: Date | string | undefined, now: number = Date.now()): number {
  const t = createdAt ? new Date(createdAt).getTime() : NaN
  if (isNaN(t)) return 0
  return t + TEACHER_EDIT_WINDOW_MS - now
}

export const canTeacherEdit = (createdAt: Date | string | undefined, now?: number) =>
  editWindowRemainingMs(createdAt, now) > 0

export const EDIT_WINDOW_CLOSED_MESSAGE =
  'The 24-hour edit window for this entry has closed. Contact HR to make changes.'
