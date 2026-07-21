export type ClassEntryDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type SessionType   = 'LIVE_SESSION' | 'RECORDED_VIDEO' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

export interface ClassEntry {
  day: ClassEntryDay
  subject: string
  chapter: string
  sessionType: SessionType
  durationHours?: number
  facultyId?: string | { _id: string; name: string; subject: string }
  notes?: string
  sessionDate?: string
  startTime?: string
  examDay?: 'MONDAY' | 'FRIDAY'
  examDate?: string
}

export interface WeeklySchedule {
  _id: string
  batchId: string | { _id: string; name: string }
  weekStartDate: string
  weekEndDate: string
  mondayExamTopic?: string
  fridayExamTopic?: string
  classEntries: ClassEntry[]
  isPublished: boolean
}

export const DAY_ORDER: ClassEntryDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export const DAY_LABELS: Record<ClassEntryDay, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
}

export const SESSION_LABELS: Record<SessionType, string> = {
  LIVE_SESSION: 'Live Session', RECORDED_VIDEO: 'Recorded Video',
  WEEKLY_EXAM: 'Weekly Exam', MONTHLY_EXAM: 'Monthly Exam',
}

export const SESSION_BADGE: Record<SessionType, { cls: string; icon: string }> = {
  LIVE_SESSION:   { cls: 'badge-blue',   icon: '🎓' },
  RECORDED_VIDEO: { cls: 'badge-purple', icon: '🎬' },
  WEEKLY_EXAM:    { cls: 'badge-orange', icon: '📝' },
  MONTHLY_EXAM:   { cls: 'badge-red',    icon: '📋' },
}

export const DAY_COLOR: Record<ClassEntryDay, string> = {
  MONDAY: '#6366f1', TUESDAY: '#0ea5e9', WEDNESDAY: '#10b981',
  THURSDAY: '#f59e0b', FRIDAY: '#ec4899', SATURDAY: '#8b5cf6', SUNDAY: '#ef4444',
}

export const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'badge-green', CANCELLED: 'badge-red',
  SCHEDULED: 'badge-blue', NOT_COMPLETED: 'badge-yellow',
}

export function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function getFacultyId(f: ClassEntry['facultyId']): string | undefined {
  if (!f) return undefined
  return typeof f === 'object' ? f._id : f
}

export function getBatchName(b: WeeklySchedule['batchId']): string {
  if (!b) return '—'
  return typeof b === 'object' ? b.name : b
}
