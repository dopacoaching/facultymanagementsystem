import { todayLocal } from '@/utils/date'

export interface FormState {
  batchId: string
  facultyId: string
  subject: string
  chapter: string
  startTime: string
  endTime: string
  breakMinutes: string
  sessionDate: string
}

export const EMPTY_FORM = (defaultBatchId = ''): FormState => ({
  batchId:      defaultBatchId,
  facultyId:    '',
  subject:      '',
  chapter:      '',
  startTime:    '',
  endTime:      '',
  breakMinutes: '',
  sessionDate:  todayLocal(),
})

const FREE_BREAK_MINUTES = 15

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export interface DurationResult {
  hours: number
  totalMinutes: number
  breakMinutes: number
  deductedMinutes: number
  error?: string
}

/** Computes payable class duration from start/end time and an optional break.
 *  The first 15 minutes of a break are free; only minutes beyond that are deducted. */
export function computeDuration(startTime: string, endTime: string, breakMinutesInput: string): DurationResult {
  if (!startTime || !endTime) {
    return { hours: 0, totalMinutes: 0, breakMinutes: 0, deductedMinutes: 0, error: 'Enter both start and end time' }
  }
  const startMin = toMinutes(startTime)
  const endMin   = toMinutes(endTime)
  const totalMinutes = endMin - startMin
  if (totalMinutes <= 0) {
    return { hours: 0, totalMinutes: 0, breakMinutes: 0, deductedMinutes: 0, error: 'End time must be after start time' }
  }
  const breakMinutes = breakMinutesInput.trim() ? Math.max(0, Number(breakMinutesInput)) : 0
  const deductedMinutes = breakMinutes > FREE_BREAK_MINUTES ? breakMinutes - FREE_BREAK_MINUTES : 0
  const payableMinutes = totalMinutes - deductedMinutes
  if (payableMinutes < 30) {
    return { hours: 0, totalMinutes, breakMinutes, deductedMinutes, error: 'Class duration after break deduction must be at least 30 minutes' }
  }
  return { hours: payableMinutes / 60, totalMinutes, breakMinutes, deductedMinutes }
}
