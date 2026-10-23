/**
 * Lab subjects offer exactly the chapters of their theory subject, so chapter lookups
 * (syllabus + HR-added options), chapter progress and HR chapter edits all resolve a lab
 * to its base. Duplicated in server/src/utils/labSubjects.ts - keep identical.
 */
export const LAB_SUBJECTS = [
  { label: 'Mathematics Lab',      value: 'MATHS LAB',            base: 'MATHS' },
  { label: 'Physics Lab',          value: 'PHYSICS LAB',          base: 'PHYSICS' },
  { label: 'Chemistry Lab',        value: 'CHEMISTRY LAB',        base: 'CHEMISTRY' },
  { label: 'Biology Lab',          value: 'BIOLOGY LAB',          base: 'BIOLOGY' },
  { label: 'Computer Science Lab', value: 'COMPUTER SCIENCE LAB', base: 'COMPUTER SCIENCE' },
] as const

const LAB_BASE: Record<string, string> = {
  ...Object.fromEntries(LAB_SUBJECTS.map((l) => [l.value, l.base])),
  'MATHEMATICS LAB': 'MATHS',
}

/** The subject whose chapter list a subject uses (itself unless it is a lab). Upper-cased,
 *  whitespace collapsed. */
export function chapterSubjectOf(subject: string): string {
  const key = subject.trim().replace(/\s+/g, ' ').toUpperCase()
  return LAB_BASE[key] ?? key
}
