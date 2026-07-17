import { BatchChapter, MONTH_NAMES, SyllabusChapter } from './types'

interface ChapterSelectorProps {
  loadingCh: boolean
  loadingSyllabus: boolean
  syllabusChapters: SyllabusChapter[]
  syllabusChaptersByMonth: Record<number, SyllabusChapter[]>
  chapters: BatchChapter[]
  needsVideoFirst: boolean
  subject: string
  value: string
  onSelect: (chapterName: string) => void
}

export function ChapterSelector({
  loadingCh, loadingSyllabus, syllabusChapters, syllabusChaptersByMonth,
  chapters, needsVideoFirst, subject, value, onSelect,
}: ChapterSelectorProps) {
  return (
    <div className="form-group">
      <label className="label">Chapter / Topic</label>
      {(loadingCh || loadingSyllabus) ? (
        <div className="input" style={{ color: 'var(--color-muted)' }}>Loading chapters…</div>
      ) : syllabusChapters.length > 0 ? (
        <>
          <select className="input" value={value} onChange={(e) => onSelect(e.target.value)}>
            <option value="">— select chapter —</option>
            {Object.entries(syllabusChaptersByMonth)
              .sort(([a], [b]) => +a - +b)
              .map(([month, chs]) => (
                <optgroup key={month} label={MONTH_NAMES[+month] ?? `Month ${month}`}>
                  {chs.map((ch) => {
                    const bc = chapters.find((b) =>
                      (b.syllabusChapterId && b.syllabusChapterId === ch._id) ||
                      b.chapterName === ch.chapterName
                    )
                    const done     = bc?.facultyClassDone
                    const videoOk  = !needsVideoFirst || bc?.videoComplete
                    const disabled = Boolean(done) || (needsVideoFirst && !videoOk)
                    const suffix   = done ? ' ✓' : needsVideoFirst && !videoOk ? ' 🔒' : ''
                    return (
                      <option key={ch._id} value={ch.chapterName} disabled={disabled}>
                        {ch.chapterName}{suffix}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
          </select>
          {needsVideoFirst && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', margin: '0.25rem 0 0' }}>
              🔒 Video not yet complete &nbsp;·&nbsp; ✓ Already logged
            </p>
          )}
        </>
      ) : (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
          {subject ? 'No syllabus chapters found for this subject.' : 'Select a subject to load chapters.'}
        </div>
      )}
    </div>
  )
}
