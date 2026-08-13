import { todayLocal } from '@/utils/date'

export const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

export interface FormState {
  batchId: string
  facultyId: string
  subject: string
  chapter: string
  startTime: string
  durationHours: number
  durationMinutes: number
  sessionDate: string
}

export const EMPTY_FORM = (defaultBatchId = ''): FormState => ({
  batchId:         defaultBatchId,
  facultyId:       '',
  subject:         '',
  chapter:         '',
  startTime:       '',
  durationHours:   1,
  durationMinutes: 0,
  sessionDate:     todayLocal(),
})
