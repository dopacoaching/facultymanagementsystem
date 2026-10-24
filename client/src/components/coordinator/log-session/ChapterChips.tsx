import { useId, useState } from 'react'

/** Edit-form chapter list: one class, one subject, any number of chapters. With `options`
 *  and `restrict` (teachers) only listed chapters can be added; otherwise (HR/Admin) any
 *  text can be typed, with the list offered as suggestions. */
export function ChapterChips({ value, onChange, options, restrict = false }: {
  value: string[]
  onChange: (v: string[]) => void
  options?: string[]
  restrict?: boolean
}) {
  const id = useId()
  const [text, setText] = useState('')
  const available = (options ?? []).filter((o) => !value.some((v) => v.toLowerCase() === o.toLowerCase()))

  function addText() {
    const name = text.trim().replace(/\s+/g, ' ')
    if (name && !value.some((v) => v.toLowerCase() === name.toLowerCase())) onChange([...value, name])
    setText('')
  }

  return (
    <div>
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
      {restrict ? (
        <select
          className="input"
          value=""
          disabled={available.length === 0}
          onChange={(e) => { if (e.target.value) onChange([...value, e.target.value]) }}
        >
          <option value="">
            {options && options.length === 0 ? 'No chapters for this subject yet'
              : available.length === 0 ? 'All chapters added'
              : value.length ? '— add another chapter —' : '— select a chapter —'}
          </option>
          {available.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="input"
            list={options ? id : undefined}
            value={text}
            placeholder="Add a chapter"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addText() } }}
          />
          <button type="button" className="btn btn-outline" onClick={addText} disabled={!text.trim()}>Add</button>
          {options && <datalist id={id}>{available.map((c) => <option key={c} value={c} />)}</datalist>}
        </div>
      )}
    </div>
  )
}
