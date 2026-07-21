import { MONTHS } from './types'

interface ReportsFilterBarProps {
  month: number
  onMonthChange: (m: number) => void
  year: number
  onYearChange: (y: number) => void
  loading: boolean
  onRefresh: () => void
}

export function ReportsFilterBar({ month, onMonthChange, year, onYearChange, loading, onRefresh }: ReportsFilterBarProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
        <button className="btn btn-ghost" onClick={onRefresh} disabled={loading} style={{ alignSelf: 'flex-end' }}>
          {loading ? <><span className="spinner" /> Loading…</> : '↻ Refresh'}
        </button>
      </div>
    </div>
  )
}
