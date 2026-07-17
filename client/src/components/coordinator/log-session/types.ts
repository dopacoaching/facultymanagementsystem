import { todayLocal } from '@/utils/date'

export const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

export const MONTH_NAMES: Record<number, string> = {
  6: 'June', 7: 'July', 8: 'August', 9: 'September',
  10: 'October', 11: 'November', 12: 'December',
}

export const NEET_SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY']

export interface FormState {
  batchId: string
  facultyId: string
  subject: string
  chapter: string
  syllabusChapterId?: string
  startTime: string
  durationHours: number
  durationMinutes: number
  sessionDate: string
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

export const EMPTY_FORM = (defaultBatchId = ''): FormState => ({
  batchId:           defaultBatchId,
  facultyId:         '',
  subject:           '',
  chapter:           '',
  syllabusChapterId: undefined,
  startTime:         '',
  durationHours:     1,
  durationMinutes:   0,
  sessionDate:       todayLocal(),
})
