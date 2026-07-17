export type ClassEntryDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type ClassSessionType = 'LIVE_SESSION' | 'RECORDED_VIDEO' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

export interface ClassEntry {
  day: ClassEntryDay
  subject: string
  chapter: string
  sessionType: ClassSessionType
  durationHours?: number
  facultyId?: string | { _id: string; name: string; subject: string }
  notes?: string
  /** Optional exact date for this session — auto-derives the day dropdown */
  sessionDate?: string
  /** Optional start time as HH:MM */
  startTime?: string
  /** WEEKLY_EXAM only — which day the exam sits on */
  examDay?: 'MONDAY' | 'FRIDAY'
  /** WEEKLY_EXAM / MONTHLY_EXAM — specific exam date (YYYY-MM-DD) */
  examDate?: string
}

export interface Schedule {
  _id: string
  batchId: string | { _id: string; name: string; type: string }
  weekStartDate: string
  weekEndDate: string
  mondayExamTopic?: string
  fridayExamTopic?: string
  classEntries: ClassEntry[]
  isPublished: boolean
  publishedAt?: string
  isRevised: boolean
  replacesScheduleId?: string
}

export const DAYS: { value: ClassEntryDay; label: string }[] = [
  { value: 'MONDAY',    label: 'Monday' },
  { value: 'TUESDAY',   label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY',  label: 'Thursday' },
  { value: 'FRIDAY',    label: 'Friday' },
  { value: 'SATURDAY',  label: 'Saturday' },
  { value: 'SUNDAY',    label: 'Sunday' },
]

export const DAY_LABELS: Record<ClassEntryDay, string> = {
  MONDAY:    'Monday',
  TUESDAY:   'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY:  'Thursday',
  FRIDAY:    'Friday',
  SATURDAY:  'Saturday',
  SUNDAY:    'Sunday',
}

export const SESSION_TYPE_LABELS: Record<ClassSessionType, string> = {
  LIVE_SESSION:   'Live Session',
  RECORDED_VIDEO: 'Recorded Video',
  WEEKLY_EXAM:    'Weekly Exam',
  MONTHLY_EXAM:   'Monthly Exam',
}

export const SESSION_TYPE_BADGE: Record<ClassSessionType, { cls: string; icon: string }> = {
  LIVE_SESSION:   { cls: 'badge-blue',   icon: '🎓' },
  RECORDED_VIDEO: { cls: 'badge-purple', icon: '🎬' },
  WEEKLY_EXAM:    { cls: 'badge-orange', icon: '📝' },
  MONTHLY_EXAM:   { cls: 'badge-red',    icon: '📋' },
}

export function dayFromDateStr(dateStr: string): ClassEntryDay {
  const days: ClassEntryDay[] = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function getBatchName(b: string | { _id: string; name: string } | null | undefined): string {
  if (!b) return '—'
  if (typeof b === 'object') return b.name
  return b
}

export function getFacultyName(f: string | { _id: string; name: string } | undefined): string {
  if (!f) return '—'
  if (typeof f === 'object') return f.name
  return f
}

export const EMPTY_ENTRY = (): ClassEntry => ({ day: 'TUESDAY', subject: '', chapter: '', sessionType: 'LIVE_SESSION', durationHours: undefined, facultyId: '', notes: '' })
