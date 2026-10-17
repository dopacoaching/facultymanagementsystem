import { useEffect, useId, useState } from 'react'
import { apiFetch } from '@/services/api'

interface SyllabusChapter {
  _id: string
  chapterName: string
}

interface ChaptersFieldProps {
  subject: string
  accessToken: string | null
  value: string[]
  onChange: (v: string[]) => void
}

/** Multi-select chapter picker: choose from the subject's chapter list (syllabus plus the
 *  ones HR added) or type a chapter that is not listed, and add as many as the class covered. */
export function ChaptersField({ subject, accessToken, value, onChange }: ChaptersFieldProps) {
  const id = useId()
  const listId = `${id}-list`
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    if (!accessToken || !subject) { setOptions([]); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      apiFetch<SyllabusChapter[]>(`/academics/syllabus/chapters?subject=${encodeURIComponent(subject)}`, { token: accessToken })
        .then((data) => data.map((c) => c.chapterName)).catch(() => [] as string[]),
      apiFetch<string[]>(`/academics/chapter-options?subject=${encodeURIComponent(subject)}`, { token: accessToken })
        .catch(() => [] as string[]),
    ])
      .then(([syllabus, added]) => {
        if (cancelled) return
        const seen = new Set(syllabus.map((n) => n.toLowerCase()))
        setOptions([...syllabus, ...added.filter((n) => !seen.has(n.toLowerCase()))])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [subject, accessToken])

  const has = (name: string) => value.some((v) => v.toLowerCase() === name.toLowerCase())

  function add(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (!name) return
    if (!has(name)) {
      // Use the list's own spelling when the typed text matches a listed chapter.
      const listed = options.find((o) => o.toLowerCase() === name.toLowerCase())
      onChange([...value, listed ?? name])
    }
    setText('')
  }

  function onInput(next: string) {
    // Picking an entry from the datalist fills the exact chapter name: add it straight away.
    if (options.some((o) => o === next)) add(next)
    else setText(next)
  }

  const available = options.filter((o) => !has(o))

  return (
    <div className="form-group">
      <label className="label" htmlFor={id}>Chapters</label>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
          {value.map((name) => (
            <span
              key={name}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.25rem 0.375rem 0.25rem 0.625rem', borderRadius: 999,
                background: 'var(--color-primary-ghost)', border: '1px solid var(--color-primary)',
                fontSize: '0.8125rem',
              }}
            >
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => onChange(value.filter((v) => v !== name))}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, color: 'inherit', padding: '0 0.25rem' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          id={id}
          type="text"
          className="input"
          list={listId}
          value={text}
          onChange={(e) => onInput(e.target.value)}
          // Enter adds the chapter instead of submitting the form.
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text) } }}
          // Leaving the box with a chapter typed in does not lose it.
          onBlur={() => add(text)}
          placeholder={
            !subject ? 'Select a subject first'
            : loading ? 'Loading chapters…'
            : value.length ? 'Add another chapter'
            : available.length ? 'Search or type a chapter'
            : 'No chapter list for this subject — type it'
          }
        />
        <button type="button" className="btn btn-outline" onClick={() => add(text)} disabled={!text.trim()}>
          Add
        </button>
      </div>
      <datalist id={listId}>
        {available.map((name) => <option key={name} value={name} />)}
      </datalist>
      <span className="help-text">Add every chapter this class covered.</span>
    </div>
  )
}
