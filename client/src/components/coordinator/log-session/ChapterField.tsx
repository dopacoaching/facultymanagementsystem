import { useEffect, useId, useState } from 'react'
import { apiFetch } from '@/services/api'

interface SyllabusChapter {
  _id: string
  chapterName: string
}

interface ChapterFieldProps {
  subject: string
  accessToken: string | null
  value: string
  onChange: (v: string) => void
}

/** Searchable dropdown (native datalist) of chapter names for the selected subject,
 *  sourced from the Academics syllabus. Falls back to free typing when the subject
 *  has no curriculum data on file (e.g. Psychology, Computer Science, Hindi). */
export function ChapterField({ subject, accessToken, value, onChange }: ChapterFieldProps) {
  const id = useId()
  const listId = `${id}-list`
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!accessToken || !subject) { setOptions([]); return }
    let cancelled = false
    setLoading(true)
    apiFetch<SyllabusChapter[]>(`/academics/syllabus/chapters?subject=${encodeURIComponent(subject)}`, { token: accessToken })
      .then((data) => { if (!cancelled) setOptions(data.map((c) => c.chapterName)) })
      .catch(() => { if (!cancelled) setOptions([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [subject, accessToken])

  return (
    <div className="form-group">
      <label className="label" htmlFor={id}>Chapter</label>
      <input
        id={id}
        type="text"
        className="input"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          !subject ? 'Select a subject first'
          : loading ? 'Loading chapters…'
          : options.length ? 'Search or type the chapter'
          : 'No chapter list for this subject — type it'
        }
      />
      <datalist id={listId}>
        {options.map((name) => <option key={name} value={name} />)}
      </datalist>
    </div>
  )
}
