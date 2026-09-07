import type { Faculty } from '@/types'
import { MONTHS } from './types'

type Mode = 'MONTH' | 'RANGE'

interface SalaryControlsProps {
  faculty: Faculty[]
  selectedId: string
  onSelectFaculty: (id: string) => void
  mode: Mode
  month: number
  onMonthChange: (m: number) => void
  year: number
  onYearChange: (y: number) => void
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  loading: boolean
  onCalculate: () => void
}

/** Local YYYY-MM-DD for a Date (not UTC — matches the date <input> value format). */
function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function presetRange(key: 'thisWeek' | 'last7' | 'thisMonth' | 'lastMonth'): { from: string; to: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (key) {
    case 'thisWeek': {
      // Week starts Monday.
      const dow = (today.getDay() + 6) % 7
      const start = new Date(today); start.setDate(today.getDate() - dow)
      return { from: toISO(start), to: toISO(today) }
    }
    case 'last7': {
      const start = new Date(today); start.setDate(today.getDate() - 6)
      return { from: toISO(start), to: toISO(today) }
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: toISO(start), to: toISO(today) }
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: toISO(start), to: toISO(end) }
    }
  }
}

const PRESETS: { key: 'thisWeek' | 'last7' | 'thisMonth' | 'lastMonth'; label: string }[] = [
  { key: 'thisWeek', label: 'This week' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
]

export function SalaryControls({
  faculty, selectedId, onSelectFaculty, mode,
  month, onMonthChange, year, onYearChange,
  from, to, onFromChange, onToChange,
  loading, onCalculate,
}: SalaryControlsProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1 1 200px', minWidth: 200 }}>
          <label className="label">Faculty</label>
          <select className="input" value={selectedId} onChange={(e) => onSelectFaculty(e.target.value)}>
            {faculty.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </div>

        {mode === 'RANGE' ? (
          <>
            <div className="form-group">
              <label className="label">From</label>
              <input type="date" className="input" value={from} max={to || undefined}
                onChange={(e) => onFromChange(e.target.value)} style={{ minWidth: 150 }} />
            </div>
            <div className="form-group">
              <label className="label">To</label>
              <input type="date" className="input" value={to} min={from || undefined}
                onChange={(e) => onToChange(e.target.value)} style={{ minWidth: 150 }} />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="label">Month</label>
              <select className="input" value={month} onChange={(e) => onMonthChange(+e.target.value)} style={{ minWidth: 100 }}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Year</label>
              <input type="number" className="input" value={year} onChange={(e) => onYearChange(+e.target.value)} style={{ width: 100 }} />
            </div>
          </>
        )}

        <button
          className="btn btn-primary"
          onClick={onCalculate}
          disabled={loading || !selectedId || (mode === 'RANGE' && (!from || !to))}
          style={{ alignSelf: 'flex-end' }}
        >
          {loading ? (
            <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Calculating…</>
          ) : 'Calculate'}
        </button>
      </div>

      {mode === 'RANGE' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.875rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', alignSelf: 'center' }}>Quick range:</span>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { const r = presetRange(p.key); onFromChange(r.from); onToChange(r.to) }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
