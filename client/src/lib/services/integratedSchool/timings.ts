export interface TimeBlock {
  morningStart: string
  morningEnd: string
  afternoonStart: string
  afternoonEnd: string
}

export function getBatchTimings(ig1Subgroup?: string | null): TimeBlock {
  if (ig1Subgroup === 'PLUS_TWO') {
    return { morningStart: '09:15', morningEnd: '13:15', afternoonStart: '14:00', afternoonEnd: '16:15' }
  }
  return { morningStart: '09:15', morningEnd: '12:45', afternoonStart: '13:30', afternoonEnd: '16:15' }
}

export function applyExamDayTimings(
  dayOfWeek: 'MONDAY' | 'FRIDAY',
  base: TimeBlock
): TimeBlock & { examStart: string; examEnd: string } {
  if (dayOfWeek === 'MONDAY') {
    return { ...base, examStart: '08:30', examEnd: '10:00', morningStart: '10:00' }
  }
  // morningStart advances to 09:45 so teaching doesn't overlap the 09:15–09:45 exam.
  return { ...base, examStart: '09:15', examEnd: '09:45', morningStart: '09:45', afternoonEnd: '17:00' }
}
