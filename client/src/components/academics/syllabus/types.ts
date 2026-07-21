export const SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'] as const
export type Subject = (typeof SUBJECTS)[number]

export interface SyllabusChapter {
  _id: string
  chapterName: string
  chapterOrder: number
  globalOrder: number
  isSplitPart: boolean
  splitGroup?: string
  splitPartNumber?: number
}

export interface MonthData {
  monthName: string
  subjects: Partial<Record<Subject, SyllabusChapter[]>>
}

export type AnnualSyllabus = Record<string, MonthData>

export const SUBJECT_LABEL: Record<Subject, string> = {
  PHYSICS:   'Physics',
  CHEMISTRY: 'Chemistry',
  BIOLOGY:   'Biology',
}

export const SUBJECT_COLOR: Record<Subject, string> = {
  PHYSICS:   'border-blue-400  bg-blue-50  text-blue-800',
  CHEMISTRY: 'border-green-400 bg-green-50 text-green-800',
  BIOLOGY:   'border-emerald-400 bg-emerald-50 text-emerald-800',
}
