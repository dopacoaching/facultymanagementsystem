import { useEffect, useId, useState } from 'react'
import { apiFetch } from '@/services/api'

interface SyllabusChapter {
  _id: string
  chapterName: string
}

/** Chapters a subject offers: the syllabus plus those HR/Admin added. Teachers can only pick from these. */
export function useChapterOptions(subject: string, accessToken: string | null): { options: string[]; loading: boolean } {
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

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

  return { options, loading }
}

interface ChaptersFieldProps {
  subject: string
  accessToken: string | null
  value: string[]
  onChange: (v: string[]) => void
}

/** Multi-select chapter picker. Only chapters on the subject's list can be chosen; new ones
 *  are added by HR/Admin on the Chapters page. */
export function ChaptersField({ subject, accessToken, value, onChange }: ChaptersFieldProps) {
  const id = useId()
  const { options, loading } = useChapterOptions(subject, accessToken)

  const available = options.filter((o) => !value.includes(o))
  const noList = !!subject && !loading && options.length === 0

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
      <select
        id={id}
        className="input"
        value=""
        disabled={!subject || loading || available.length === 0}
        onChange={(e) => { if (e.target.value) onChange([...value, e.target.value]) }}
      >
        <option value="">
          {!subject ? 'Select a subject first'
            : loading ? 'Loading chapters…'
            : noList ? 'No chapters for this subject yet'
            : available.length === 0 ? 'All chapters added'
            : value.length ? '— add another chapter —'
            : '— select a chapter —'}
        </option>
        {available.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      {noList ? (
        <span className="help-text">No chapters are set up for this subject. Ask HR to add them before pushing this class.</span>
      ) : (
        <span className="help-text">Add every chapter this class covered. A missing chapter must be added by HR.</span>
      )}
    </div>
  )
}
