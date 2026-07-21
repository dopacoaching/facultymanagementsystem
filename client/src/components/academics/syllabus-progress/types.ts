export const SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'] as const
export type Subject = (typeof SUBJECTS)[number]

export type MonthStatus = 'ON_TRACK' | 'SLIGHTLY_BEHIND' | 'BEHIND' | 'NOT_STARTED' | 'COMPLETED'

export interface MonthProgress {
  monthName: string
  chaptersPlanned: number
  chaptersCompleted: number
  chaptersOnTime: number
  chaptersLate: number
  status: MonthStatus
}

export interface ProgressResponse {
  batchId: string
  batchName: string
  // month keys are serialised as strings by JSON (e.g. "6", "7" …)
  progress: Record<Subject, Record<string, MonthProgress>>
}

export const STATUS_CONFIG: Record<MonthStatus, { label: string; icon: string; cls: string }> = {
  ON_TRACK:        { label: 'On Track',       icon: '✅', cls: 'bg-green-100 text-green-800 border-green-300' },
  SLIGHTLY_BEHIND: { label: '1 Behind',       icon: '⚠️', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  BEHIND:          { label: 'Behind',         icon: '🔴', cls: 'bg-red-100 text-red-800 border-red-300' },
  NOT_STARTED:     { label: 'Not Started',    icon: '⬜', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  COMPLETED:       { label: 'Completed',      icon: '🏆', cls: 'bg-blue-100 text-blue-800 border-blue-300' },
}

export const SUBJECT_LABEL: Record<Subject, string> = {
  PHYSICS:   'Physics',
  CHEMISTRY: 'Chemistry',
  BIOLOGY:   'Biology',
}

export const MONTHS = [6, 7, 8, 9, 10, 11, 12]
export const MONTH_SHORT: Record<number, string> = {
  6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
}
