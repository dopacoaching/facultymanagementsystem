import type { Faculty } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { fmtDate, MONTHS } from './types'

interface AddDatesCardProps {
  selectedFacultyObj: Faculty | undefined
  month: number
  year: number
  pendingDate: string
  onPendingDateChange: (d: string) => void
  minDate: string
  maxDate: string
  onAddToStaging: () => void
  stagingDates: string[]
  onRemoveStaged: (d: string) => void
  saveError: string
  saving: boolean
  onSave: () => void
}

export function AddDatesCard({
  selectedFacultyObj, month, year, pendingDate, onPendingDateChange, minDate, maxDate,
  onAddToStaging, stagingDates, onRemoveStaged, saveError, saving, onSave,
}: AddDatesCardProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h2>
          Add Available Dates
          {selectedFacultyObj && (
            <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: '0.9375rem', marginLeft: '0.5rem' }}>
              — {selectedFacultyObj.name}
            </span>
          )}
        </h2>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{MONTHS[month - 1]} {year}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={pendingDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => onPendingDateChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onAddToStaging() }}
          />
        </div>
        <button
          className="btn btn-ghost"
          onClick={onAddToStaging}
          disabled={!pendingDate}
          style={{ alignSelf: 'flex-end' }}
        >
          + Add to list
        </button>
      </div>

      {stagingDates.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Pending ({stagingDates.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
            {stagingDates.map((d) => (
              <span key={d} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-dim, rgba(79,70,229,.1))',
                color: 'var(--color-primary)', fontSize: '0.8125rem', fontWeight: 500,
                border: '1px solid rgba(79,70,229,.2)',
              }}>
                {fmtDate(d + 'T00:00:00')}
                <button
                  onClick={() => onRemoveStaged(d)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.6, fontSize: '0.9rem', lineHeight: 1 }}
                >×</button>
              </span>
            ))}
          </div>
          {saveError && (
            <div style={{ marginBottom: '0.75rem' }}>
              <ErrorAlert message={saveError} />
            </div>
          )}
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : `Save ${stagingDates.length} date${stagingDates.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
