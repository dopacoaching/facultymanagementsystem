import { todayLocal } from '@/utils/date'

export interface SubjectOption {
  label: string
  /** Stored value. Matches the SyllabusChapter subject enum where curriculum data
   *  exists (Maths/Physics/Chemistry/Biology/English/Malayalam/Arabic), so the
   *  Chapter field can look up real chapters for those subjects. */
  value: string
}

export const SUBJECT_OPTIONS: SubjectOption[] = [
  { label: 'Mathematics',       value: 'MATHS' },
  { label: 'Physics',           value: 'PHYSICS' },
  { label: 'Chemistry',         value: 'CHEMISTRY' },
  { label: 'Biology',           value: 'BIOLOGY' },
  { label: 'Psychology',        value: 'PSYCHOLOGY' },
  { label: 'English',           value: 'ENGLISH' },
  { label: 'Computer Science',  value: 'COMPUTER SCIENCE' },
  { label: 'Malayalam',         value: 'MALAYALAM' },
  { label: 'Arabic',            value: 'ARABIC' },
  { label: 'Hindi',             value: 'HINDI' },
]

export type ClassMode = 'ONLINE' | 'OFFLINE' | 'ONLINE_DOUBT_CLEARANCE' | 'OFFLINE_DOUBT_CLEARANCE'

export const CLASS_MODE_OPTIONS: { label: string; value: ClassMode }[] = [
  { label: 'Online',                   value: 'ONLINE' },
  { label: 'Offline',                  value: 'OFFLINE' },
  { label: 'Online Doubt Clearance',   value: 'ONLINE_DOUBT_CLEARANCE' },
  { label: 'Offline Doubt Clearance',  value: 'OFFLINE_DOUBT_CLEARANCE' },
]

export interface FormState {
  facultyId: string
  subject: string
  chapter: string
  classMode: ClassMode | ''
  sessionCategory: 'CLASS' | 'DOUBT_CLEARANCE' | ''
  scheduledTime: string
  startTime: string
  endTime: string
  noBreak: boolean
  breakMinutes: string
  updatedByName: string
  sessionDate: string
}

export const EMPTY_FORM = (): FormState => ({
  facultyId:       '',
  subject:         '',
  chapter:         '',
  classMode:       '',
  sessionCategory: '',
  scheduledTime:   '',
  startTime:       '',
  endTime:         '',
  noBreak:         false,
  breakMinutes:    '',
  updatedByName:   '',
  sessionDate:     todayLocal(),
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

/** Computes payable class duration from start/end time and a break.
 *  The teacher must either mark "Nil" (no break) or enter break minutes — one
 *  or the other is required. The first 15 minutes of a break are free; only
 *  minutes beyond that are deducted. */
export function computeDuration(startTime: string, endTime: string, noBreak: boolean, breakMinutesInput: string): DurationResult {
  if (!startTime || !endTime) {
    return { hours: 0, totalMinutes: 0, breakMinutes: 0, deductedMinutes: 0, error: 'Enter both start and end time' }
  }
  const startMin = toMinutes(startTime)
  const endMin   = toMinutes(endTime)
  const totalMinutes = endMin - startMin
  if (totalMinutes <= 0) {
    return { hours: 0, totalMinutes: 0, breakMinutes: 0, deductedMinutes: 0, error: 'End time must be after start time' }
  }
  if (!noBreak && !breakMinutesInput.trim()) {
    return { hours: 0, totalMinutes, breakMinutes: 0, deductedMinutes: 0, error: 'Enter the break minutes, or mark "Nil" if there was no break' }
  }
  const breakMinutes = noBreak ? 0 : Math.max(0, Number(breakMinutesInput))
  const deductedMinutes = breakMinutes > FREE_BREAK_MINUTES ? breakMinutes - FREE_BREAK_MINUTES : 0
  const payableMinutes = totalMinutes - deductedMinutes
  if (payableMinutes < 30) {
    return { hours: 0, totalMinutes, breakMinutes, deductedMinutes, error: 'Class duration after break deduction must be at least 30 minutes' }
  }
  return { hours: payableMinutes / 60, totalMinutes, breakMinutes, deductedMinutes }
}
