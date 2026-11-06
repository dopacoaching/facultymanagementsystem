import { useId } from 'react'
import type { BreaksInput, BreakField } from './types'
import s from './Log.module.css'

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
  const id = useId()
  return (
    <div className="form-group">
      <label className="label" htmlFor={id}>{label} <span className={s.note}>· {note}</span></label>
      <div className={s.breakRow}>
        <input
          id={id}
          type="number"
          className={`input ${s.breakInput}`}
          min={0}
          inputMode="numeric"
          value={field.minutes}
          disabled={field.nil}
          onChange={(e) => onChange({ minutes: e.target.value })}
          placeholder="Minutes"
        />
        <button
          type="button"
          aria-pressed={field.nil}
          className={`btn ${field.nil ? 'btn-primary' : 'btn-outline'} ${s.nilBtn}`}
          onClick={() => onChange(field.nil ? { nil: false } : { nil: true, minutes: '' })}
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
  breaks, onBreaksChange, fullDeduction,
}: {
  breaks: BreaksInput
  onBreaksChange: (b: BreaksInput) => void
  /** Studio Live: every break is deducted in full, no 15-minute grace. */
  fullDeduction?: boolean
}) {
  const patchBreak = (key: keyof BreaksInput, patch: Partial<BreakField>) =>
    onBreaksChange({ ...breaks, [key]: { ...breaks[key], ...patch } })
  const allNil = BREAK_ROWS.every((r) => breaks[r.key].nil)

  return (
    <div className={s.breaksBlock}>
      <div className={s.breaksHead}>
        <span className="label">Breaks</span>
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
            note={fullDeduction ? 'deducted in full' : r.note}
            field={breaks[r.key]}
            onChange={(patch) => patchBreak(r.key, patch)}
          />
        ))}
      </div>
    </div>
  )
}
