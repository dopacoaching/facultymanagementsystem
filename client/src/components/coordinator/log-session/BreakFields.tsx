import type { BreaksInput, BreakField } from './types'

export function formatHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const BREAK_ROWS: { key: keyof BreaksInput; label: string; note: string }[] = [
  { key: 'morning',   label: 'Morning break',   note: 'first 15m free' },
  { key: 'lunch',     label: 'Lunch break',     note: 'unpaid, no grace' },
  { key: 'afternoon', label: 'Afternoon break', note: 'first 15m free' },
]

export function BreakRow({
  label, note, field, onChange,
}: {
  label: string
  note: string
  field: BreakField
  onChange: (patch: Partial<BreakField>) => void
}) {
  return (
    <div className="form-group">
      <label className="label">{label} <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>· {note}</span></label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="number"
          className="input"
          min={0}
          value={field.minutes}
          disabled={field.nil}
          onChange={(e) => onChange({ minutes: e.target.value })}
          placeholder="Minutes"
          style={{ opacity: field.nil ? 0.5 : 1 }}
        />
        <button
          type="button"
          aria-pressed={field.nil}
          className={`btn ${field.nil ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => onChange(field.nil ? { nil: false } : { nil: true, minutes: '' })}
          style={{ whiteSpace: 'nowrap' }}
        >
          Nil
        </button>
      </div>
    </div>
  )
}

/** The three break rows (Morning / Lunch / Afternoon) plus a bulk Nil toggle.
 *  Shared by the log form and the HR edit modals. */
export function BreakRows({
  breaks, onBreaksChange,
}: {
  breaks: BreaksInput
  onBreaksChange: (b: BreaksInput) => void
}) {
  const patchBreak = (key: keyof BreaksInput, patch: Partial<BreakField>) =>
    onBreaksChange({ ...breaks, [key]: { ...breaks[key], ...patch } })
  const allNil = BREAK_ROWS.every((r) => breaks[r.key].nil)

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <span className="label" style={{ marginBottom: 0 }}>Breaks</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onBreaksChange({
            morning:   { nil: !allNil, minutes: '' },
            lunch:     { nil: !allNil, minutes: '' },
            afternoon: { nil: !allNil, minutes: '' },
          })}
        >
          {allNil ? 'Clear all' : 'No breaks'}
        </button>
      </div>
      <div className="input-group">
        {BREAK_ROWS.map((r) => (
          <BreakRow
            key={r.key}
            label={r.label}
            note={r.note}
            field={breaks[r.key]}
            onChange={(patch) => patchBreak(r.key, patch)}
          />
        ))}
      </div>
    </div>
  )
}
