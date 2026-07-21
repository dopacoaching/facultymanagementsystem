import type { Faculty } from '@/types'
import { MONTHS } from './types'

interface SalaryControlsProps {
  faculty: Faculty[]
  selectedId: string
  onSelectFaculty: (id: string) => void
  month: number
  onMonthChange: (m: number) => void
  year: number
  onYearChange: (y: number) => void
  loading: boolean
  onCalculate: () => void
}

export function SalaryControls({
  faculty, selectedId, onSelectFaculty, month, onMonthChange, year, onYearChange, loading, onCalculate,
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
        <button
          className="btn btn-primary"
          onClick={onCalculate}
          disabled={loading || !selectedId}
          style={{ alignSelf: 'flex-end' }}
        >
          {loading ? (
            <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Calculating…</>
          ) : '⚡ Calculate'}
        </button>
      </div>
    </div>
  )
}
