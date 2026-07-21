export type ChapterStatus = 'NOT_YET_SCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export interface ISChapter {
  _id:           string
  batchId:       string
  subject:       string
  chapterName:   string
  chapterOrder:  number
  status:        ChapterStatus
  scheduledDate?: string
  completedDate?: string
}

export const STATUS_BADGE: Record<ChapterStatus, string> = {
  NOT_YET_SCHEDULED: 'badge-gray',
  SCHEDULED:         'badge-blue',
  COMPLETED:         'badge-green',
  CANCELLED:         'badge-red',
}

export const STATUS_LABEL: Record<ChapterStatus, string> = {
  NOT_YET_SCHEDULED: 'Not Scheduled',
  SCHEDULED:         'Scheduled',
  COMPLETED:         'Completed',
  CANCELLED:         'Cancelled',
}

export const ALL_STATUSES: ChapterStatus[] = ['NOT_YET_SCHEDULED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']

export const SUBGROUP_LABEL: Record<string, string> = {
  PLUS_ONE: 'Plus 1',
  PLUS_TWO: 'Plus 2',
}

export const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
