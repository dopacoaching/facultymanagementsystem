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

// ── Breaks ───────────────────────────────────────────────────────────────────
// A full-day class has up to three breaks. Morning and Afternoon get a 15-minute
// grace — only minutes beyond 15 are deducted from payable hours. Lunch is
// normal unpaid time: subtracted in full, but never a "penalty" (no grace).

export interface BreakField {
  /** "Nil" — there was no such break. */
  nil: boolean
  /** Raw minutes as typed. Ignored when `nil`. */
  minutes: string
}

export interface BreaksInput {
  morning: BreakField
  lunch: BreakField
  afternoon: BreakField
}

export const emptyBreaks = (): BreaksInput => ({
  morning:   { nil: false, minutes: '' },
  lunch:     { nil: false, minutes: '' },
  afternoon: { nil: false, minutes: '' },
})

/** Rebuild a BreaksInput from stored session minutes (absent ⇒ Nil, 0 ⇒ Nil). */
export const breaksFromMinutes = (
  morning?: number | null,
  lunch?: number | null,
  afternoon?: number | null,
): BreaksInput => {
  const field = (v?: number | null): BreakField =>
    v == null || v === 0 ? { nil: true, minutes: '' } : { nil: false, minutes: String(v) }
  return { morning: field(morning), lunch: field(lunch), afternoon: field(afternoon) }
}

export interface FormState {
  facultyId: string
  subject: string
  chapter: string
  classMode: ClassMode | ''
  sessionCategory: 'CLASS' | 'DOUBT_CLEARANCE' | ''
  scheduledTime: string
  startTime: string
  endTime: string
  breaks: BreaksInput
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
  breaks:          emptyBreaks(),
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
  /** Resolved minutes per break (Nil ⇒ 0). */
  morningBreak: number
  lunchBreak: number
  afternoonBreak: number
  /** Total minutes taken off the class span: lunch in full + each of morning /
   *  afternoon beyond its 15-minute grace. */
  deductedMinutes: number
  error?: string
}

/** One break row must be answered — a number, or marked Nil. Returns the
 *  resolved minutes, or an error string. */
function resolveBreak(b: BreakField): number | { error: string } {
  if (b.nil) return 0
  if (!b.minutes.trim()) return { error: 'Enter minutes for each break, or mark it Nil.' }
  const n = Number(b.minutes)
  if (isNaN(n) || n < 0) return { error: 'Break minutes must be a positive number.' }
  return n
}

/** Computes payable class duration from start/end time and the three breaks.
 *  payable = (end − start) − lunch − max(0, morning−15) − max(0, afternoon−15). */
export function computeDuration(startTime: string, endTime: string, breaks: BreaksInput): DurationResult {
  const zero = { hours: 0, totalMinutes: 0, morningBreak: 0, lunchBreak: 0, afternoonBreak: 0, deductedMinutes: 0 }
  if (!startTime || !endTime) {
    return { ...zero, error: 'Enter both start and end time' }
  }
  const totalMinutes = toMinutes(endTime) - toMinutes(startTime)
  if (totalMinutes <= 0) {
    return { ...zero, error: 'End time must be after start time' }
  }

  const m = resolveBreak(breaks.morning)
  const l = resolveBreak(breaks.lunch)
  const a = resolveBreak(breaks.afternoon)
  for (const r of [m, l, a]) {
    if (typeof r === 'object') return { ...zero, totalMinutes, error: r.error }
  }
  const morningBreak = m as number
  const lunchBreak = l as number
  const afternoonBreak = a as number

  const graced = (mins: number) => (mins > FREE_BREAK_MINUTES ? mins - FREE_BREAK_MINUTES : 0)
  const deductedMinutes = lunchBreak + graced(morningBreak) + graced(afternoonBreak)
  const payableMinutes = totalMinutes - deductedMinutes

  const base = { totalMinutes, morningBreak, lunchBreak, afternoonBreak, deductedMinutes }
  if (payableMinutes < 30) {
    return { ...base, hours: 0, error: 'Class duration after break deductions must be at least 30 minutes' }
  }
  return { ...base, hours: payableMinutes / 60 }
}
