export const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:     'badge-blue',
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  NOT_COMPLETED: 'badge-yellow',
}

export const STATUS_OPTIONS = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOT_COMPLETED']

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export const MONTH_NAMES: Record<number, string> = {
  6: 'June', 7: 'July', 8: 'August', 9: 'September',
  10: 'October', 11: 'November', 12: 'December',
}

export const NEET_SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY']

export const BATCH_TYPE_BADGE: Record<string, string> = {
  RESIDENTIAL: 'badge-purple',
  ONLINE:      'badge-blue',
  OFFLINE:     'badge-gray',
}

export interface BatchChapter {
  _id: string
  subject: string
  chapterName: string
  syllabusChapterId?: string
  videoComplete: boolean
  facultyClassDone: boolean
}

export interface SyllabusChapter {
  _id: string
  subject: string
  chapterName: string
  scheduledMonth: number
  chapterOrder: number
  isSplitPart: boolean
  splitPartNumber?: number
}

export interface NewSessionForm {
  facultyId: string
  batchId: string
  subject: string
  chapter: string
  syllabusChapterId: string | undefined
  startTime: string
  durationHours: number
  durationMinutes: number
  sessionDate: string
  sessionCategory: 'CLASS' | 'DOUBT_CLEARANCE'
}

export interface EditSessionForm {
  facultyId: string
  batchId: string
  subject: string
  chapter: string
  sessionDate: string
  durationHours: number
}
