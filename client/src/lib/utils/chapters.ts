/** A class can cover several chapters. `chapter` keeps the readable "A, B" text that every
 *  report shows; `chapters` keeps the individual names (only stored when there is more than one). */
export const MAX_CHAPTERS = 20
const MAX_CHAPTER_LENGTH = 120

/** Unique, trimmed chapter names from a `chapters` list (or a single `chapter` fallback). */
export function normalizeChapters(list: unknown, single?: unknown): string[] {
  const raw: unknown[] = Array.isArray(list) ? list : single ? [single] : []
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of raw) {
    if (typeof v !== 'string') continue
    const name = v.trim().replace(/\s+/g, ' ').slice(0, MAX_CHAPTER_LENGTH)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(name)
    if (out.length >= MAX_CHAPTERS) break
  }
  return out
}

export const joinChapters = (chapters: string[]) => chapters.join(', ')

/** Names a session's BatchChapter rows were marked under (the single `chapter` for older entries). */
export const chapterNamesOf = (s: { chapter?: string; chapters?: string[] }): string[] =>
  s.chapters?.length ? s.chapters : s.chapter ? [s.chapter] : []
