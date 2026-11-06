import { useId, useState } from 'react'
import s from './Log.module.css'

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
        <div className={s.chips}>
          {value.map((name) => (
            <span key={name} className={s.chip}>
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => onChange(value.filter((v) => v !== name))}
                className={s.chipRemove}
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
        <div className={s.addRow}>
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
