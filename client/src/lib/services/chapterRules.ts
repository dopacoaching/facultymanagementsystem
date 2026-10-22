import { SyllabusChapter } from '@/lib/models/SyllabusChapter'
import { ChapterOption } from '@/lib/models/ChapterOption'
import { chapterSubjectOf } from '@/lib/constants/labSubjects'

/** Lower-cased names of every chapter a subject offers: the syllabus plus those HR/Admin added. */
async function allowedChapterNames(subject: string): Promise<Set<string>> {
  const key = chapterSubjectOf(subject)
  const [syllabus, added] = await Promise.all([
    SyllabusChapter.find({ subject: key }).select('chapterName').lean(),
    ChapterOption.find({ subject: key }).select('name').lean(),
  ])
  return new Set([...syllabus.map((c) => c.chapterName), ...added.map((c) => c.name)].map((n) => n.toLowerCase()))
}

/** Chapters (from a list of names) that the subject does not offer. Class teachers may only
 *  log listed chapters; HR/Admin add new ones on the Chapters page. */
export async function unlistedChapters(subject: string, names: string[]): Promise<string[]> {
  if (names.length === 0) return []
  const allowed = await allowedChapterNames(subject)
  return names.filter((n) => !allowed.has(n.toLowerCase()))
}

/** Same check for an edited chapter text, which is one chapter or several joined with ", ". */
export async function unlistedInChapterText(subject: string, text: string): Promise<string[]> {
  const allowed = await allowedChapterNames(subject)
  if (allowed.has(text.trim().toLowerCase())) return []
  return text.split(',').map((n) => n.trim()).filter((n) => n && !allowed.has(n.toLowerCase()))
}

export const unlistedChapterMessage = (subject: string, bad: string[]) =>
  allowedHint(subject, bad)

function allowedHint(subject: string, bad: string[]): string {
  return `${bad.length === 1 ? 'This chapter is' : 'These chapters are'} not in the ${subject} list: ${bad.join(', ')}. Ask HR to add ${bad.length === 1 ? 'it' : 'them'} first.`
}
