import s from './Reports.module.css'

export interface BatchChoice { _id: string; name: string }

/** Tick-list of batches that sat one class together (shared by the teacher and HR edit forms). */
export function BatchPicker({ batches, value, onChange, hint = 'Tick every batch that attended this class together.' }: {
  batches: BatchChoice[]
  value: string[]
  onChange: (ids: string[]) => void
  hint?: string
}) {
  return (
    <div className="form-group field-col-span" style={{ gridColumn: '1 / -1' }}>
      <span className="label" id="batch-picker-label">Batches</span>
      <div role="group" aria-labelledby="batch-picker-label" className={s.pickerWrap}>
        {batches.map((b) => {
          const checked = value.includes(b._id)
          return (
            <label key={b._id} className={`${s.pick} ${checked ? s.pickOn : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? value.filter((id) => id !== b._id) : [...value, b._id])}
              />
              {b.name}
            </label>
          )
        })}
      </div>
      <span className="help-text">{hint}</span>
    </div>
  )
}
