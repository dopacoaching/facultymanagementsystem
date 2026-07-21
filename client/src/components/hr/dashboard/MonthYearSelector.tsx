import { MONTHS } from './types'

interface MonthYearSelectorProps {
  month: number
  onMonthChange: (m: number) => void
  year: number
  onYearChange: (y: number) => void
  loading: boolean
  onRefresh: () => void
}

export function MonthYearSelector({ month, onMonthChange, year, onYearChange, loading, onRefresh }: MonthYearSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="label">Month</label>
        <select className="input" value={month} onChange={(e) => onMonthChange(+e.target.value)} style={{ minWidth: 100 }}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="label">Year</label>
        <input type="number" className="input" value={year} onChange={(e) => onYearChange(+e.target.value)} style={{ width: 90 }} />
      </div>
      <button className="btn btn-ghost" onClick={onRefresh} disabled={loading} style={{ marginBottom: '0.05rem' }}>
        {loading ? <><span className="spinner" /> Refreshing…</> : '↻ Refresh'}
      </button>
      <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--color-muted)', alignSelf: 'center' }}>
        {MONTHS[month - 1]} {year} overview
      </span>
    </div>
  )
}
