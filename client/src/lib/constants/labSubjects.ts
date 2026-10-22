/**
 * Lab subjects offer exactly the chapters of their theory subject, so chapter lookups
 * (syllabus + HR-added options) and HR chapter edits all resolve a lab to its base.
 */
const LAB_BASE_SUBJECT: Record<string, string> = {
  'MATHS LAB': 'MATHS',
  'PHYSICS LAB': 'PHYSICS',
  'CHEMISTRY LAB': 'CHEMISTRY',
  'BIOLOGY LAB': 'BIOLOGY',
  'COMPUTER SCIENCE LAB': 'COMPUTER SCIENCE',
}

/** The subject whose chapter list a subject uses (itself unless it is a lab). Upper-cased. */
export function chapterSubjectOf(subject: string): string {
  const key = subject.trim().toUpperCase()
  return LAB_BASE_SUBJECT[key] ?? key
}
