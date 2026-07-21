export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
}

export const HOURS_STATUS_BADGE: Record<string, string> = {
  MET:      'badge-green',
  ON_TRACK: 'badge-blue',
  AT_RISK:  'badge-yellow',
  MISSED:   'badge-red',
  NO_QUOTA: 'badge-gray',
}

export interface Schedule {
  _id: string
  batchId: string | { _id: string; name: string }
  weekStartDate: string
  weekEndDate: string
  mondayExamTopic?: string
  fridayExamTopic?: string
  isPublished: boolean
}

export interface ChapterSummary {
  batchId: string
  totalChapters: number
  videoComplete: number
  facultyClassDone: number
  pendingVideo: number  // facultyClassDone but !videoComplete (Residential/Online concern)
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
