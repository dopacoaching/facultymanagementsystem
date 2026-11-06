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

export const STATUS_CONFIG: Record<MonthStatus, { label: string; cls: string }> = {
  ON_TRACK:        { label: 'On Track',    cls: 'badge-green' },
  SLIGHTLY_BEHIND: { label: '1 Behind',    cls: 'badge-yellow' },
  BEHIND:          { label: 'Behind',      cls: 'badge-red' },
  NOT_STARTED:     { label: 'Not Started', cls: 'badge-gray' },
  COMPLETED:       { label: 'Completed',   cls: 'badge-blue' },
}

export const SUBJECT_LABEL: Record<Subject, string> = {
  PHYSICS:   'Physics',
  CHEMISTRY: 'Chemistry',
  BIOLOGY:   'Biology',
}

export const MONTHS = [6, 7, 8, 9, 10, 11, 12, 13]
export const MONTH_SHORT: Record<number, string> = {
  6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec', 13: 'Jan',
}
