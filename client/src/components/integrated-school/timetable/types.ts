export type IGSessionSlot = 'SESSION_1' | 'SESSION_2' | 'SESSION_3'
export type IGSessionType = 'LIVE_SESSION' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

export interface Slot {
  _id:         string
  date:        string
  campusId:    { _id: string; name: string } | string
  batchId:     { _id: string; name: string; type: string; ig1Subgroup?: string } | string
  facultyId?:  { _id: string; name: string } | string
  subject:     string
  chapter:     string
  timeSlot:    IGSessionSlot
  sessionType: IGSessionType
  /** Planned duration in hours */
  durationHours?: number
  startTime?:  string
  status:      'PLANNED' | 'COMPLETED' | 'CANCELLED'
  notes?:      string
  isUnplanned: boolean
}

export interface SpecialDay {
  _id:      string
  date:     string
  campusId?: { _id: string; name: string } | null
  type:     string
  notes?:   string
}

export interface DailyResponse {
  slots:       Slot[]
  specialDays: SpecialDay[]
  date:        string
}

export interface ISChapter {
  _id:          string
  batchId:      string
  subject:      string
  chapterName:  string
  chapterOrder: number
  status:       string
}

export const SPECIAL_DAY_TYPES = ['MONDAY_EXAM', 'FRIDAY_EXAM', 'WEEKLY_EXAM', 'TOUR', 'BUFFER_DAY', 'HOLIDAY']

export const SESSION_SLOTS: { value: IGSessionSlot; label: string }[] = [
  { value: 'SESSION_1', label: 'Session 1' },
  { value: 'SESSION_2', label: 'Session 2' },
  { value: 'SESSION_3', label: 'Session 3' },
]

export const SESSION_TYPES: { value: IGSessionType; label: string }[] = [
  { value: 'LIVE_SESSION',  label: '🎓 Live Session' },
  { value: 'WEEKLY_EXAM',   label: '📝 Weekly Exam (Mon / Fri)' },
  { value: 'MONTHLY_EXAM',  label: '📋 Monthly Exam' },
]

export const SESSION_TYPE_BADGE: Record<IGSessionType, string> = {
  LIVE_SESSION:  'badge-blue',
  WEEKLY_EXAM:   'badge-indigo',
  MONTHLY_EXAM:  'badge-purple',
}

export const SESSION_TYPE_LABEL: Record<IGSessionType, string> = {
  LIVE_SESSION:  'Live',
  WEEKLY_EXAM:   'Weekly Exam',
  MONTHLY_EXAM:  'Monthly Exam',
}

export const SLOT_STATUS_BADGE: Record<string, string> = {
  PLANNED:   'badge-blue',
  COMPLETED: 'badge-green',
  CANCELLED: 'badge-red',
}

export const SPECIAL_TYPE_BADGE: Record<string, string> = {
  MONDAY_EXAM: 'badge-indigo',
  FRIDAY_EXAM: 'badge-indigo',
  WEEKLY_EXAM: 'badge-purple',
  TOUR:        'badge-yellow',
  BUFFER_DAY:  'badge-gray',
  HOLIDAY:     'badge-red',
}

export function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
