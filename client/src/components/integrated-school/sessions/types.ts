export interface ISession {
  _id: string
  facultyId: { _id: string; name: string } | string | null
  batchId: string
  subject: string
  chapter: string
  durationHours: number
  sessionDate: string
  status: string
}

export interface ISBatchChapter {
  _id: string
  subject: string
  chapterName: string
  chapterOrder: number
  status: 'NOT_YET_SCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
}

export interface NewIGSessionForm {
  facultyId: string
  batchId: string
  subject: string
  chapter: string
  startTime: string
  durationHours: string
  sessionDate: string
}

export interface EditIGSessionForm {
  facultyId: string
  batchId: string
  subject: string
  chapter: string
  sessionDate: string
}

export const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:     'badge-blue',
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  NOT_COMPLETED: 'badge-yellow',
}

export const STATUS_OPTIONS = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOT_COMPLETED']
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function formatDuration(decimalHours: number): string {
  const h = Math.floor(decimalHours)
  const m = Math.round((decimalHours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
