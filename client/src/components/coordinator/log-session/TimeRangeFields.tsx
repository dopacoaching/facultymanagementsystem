import { todayLocal } from '@/utils/date'
import type { BreaksInput, BreakField, DurationResult } from './types'

interface TimeRangeFieldsProps {
  scheduledTime: string
  onScheduledTimeChange: (v: string) => void
  startTime: string
  onStartTimeChange: (v: string) => void
  endTime: string
  onEndTimeChange: (v: string) => void
  breaks: BreaksInput
  onBreaksChange: (b: BreaksInput) => void
  sessionDate: string
  onSessionDateChange: (v: string) => void
  duration: DurationResult
}

function formatHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const BREAK_ROWS: { key: keyof BreaksInput; label: string; note: string }[] = [
  { key: 'morning',   label: 'Morning break',   note: 'first 15m free' },
  { key: 'lunch',     label: 'Lunch break',     note: 'unpaid, no grace' },
  { key: 'afternoon', label: 'Afternoon break', note: 'first 15m free' },
]

function BreakRow({
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

export function TimeRangeFields({
  scheduledTime, onScheduledTimeChange,
  startTime, onStartTimeChange, endTime, onEndTimeChange,
  breaks, onBreaksChange,
  sessionDate, onSessionDateChange, duration,
}: TimeRangeFieldsProps) {
  return (
    <>
      <div className="input-group">
        <div className="form-group">
          <label className="label">Scheduled Time (optional)</label>
          <input
            type="time"
            className="input"
            value={scheduledTime}
            onChange={(e) => onScheduledTimeChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Class Start Time</label>
          <input
            type="time"
            className="input"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Class End Time</label>
          <input
            type="time"
            className="input"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Session Date</label>
          <input
            type="date"
            className="input"
            value={sessionDate}
            max={todayLocal()}
            onChange={(e) => onSessionDateChange(e.target.value)}
          />
        </div>
      </div>

      <BreakRows breaks={breaks} onBreaksChange={onBreaksChange} />

      {!duration.error && startTime && endTime && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', margin: '0.5rem 0 0' }}>
          Payable duration: <strong style={{ color: 'var(--color-text)' }}>{formatHM(duration.hours * 60)}</strong>
          {duration.deductedMinutes > 0 && (
            <> &nbsp;·&nbsp; {duration.deductedMinutes}m deducted
              {' ('}
              {[
                duration.lunchBreak > 0 ? `lunch ${duration.lunchBreak}m` : null,
                duration.morningBreak > 15 ? `morning +${duration.morningBreak - 15}m` : null,
                duration.afternoonBreak > 15 ? `afternoon +${duration.afternoonBreak - 15}m` : null,
              ].filter(Boolean).join(', ')}
              {')'}
            </>
          )}
        </p>
      )}
    </>
  )
}
