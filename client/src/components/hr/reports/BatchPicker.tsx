export interface BatchChoice { _id: string; name: string }

/** Tick-list of batches that sat one class together (shared by the teacher and HR edit forms). */
export function BatchPicker({ batches, value, onChange, hint = 'Tick every batch that attended this class together.' }: {
  batches: BatchChoice[]
  value: string[]
  onChange: (ids: string[]) => void
  hint?: string
}) {
  return (
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="label">Batches</label>
      <div role="group" aria-label="Batches" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {batches.map((b) => {
          const checked = value.includes(b._id)
          return (
            <label
              key={b._id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                padding: '0.375rem 0.75rem', borderRadius: 'var(--radius)', fontSize: '0.875rem',
                border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: checked ? 'var(--color-primary-ghost)' : 'var(--color-surface)',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? value.filter((id) => id !== b._id) : [...value, b._id])}
                style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
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
