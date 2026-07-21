import type { Faculty } from '@/types'
import { MONTHS } from './types'

interface AvailabilityFilterBarProps {
  faculty: Faculty[]
  selectedFaculty: string
  onFacultyChange: (id: string) => void
  month: number
  onMonthChange: (m: number) => void
  year: number
  onYearChange: (y: number) => void
}

export function AvailabilityFilterBar({
  faculty, selectedFaculty, onFacultyChange, month, onMonthChange, year, onYearChange,
}: AvailabilityFilterBarProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ minWidth: 200, flex: '1 1 200px' }}>
          <label className="label">Faculty</label>
          <select
            className="input"
            value={selectedFaculty}
            onChange={(e) => onFacultyChange(e.target.value)}
          >
            <option value="">— Select faculty —</option>
            {faculty.map((f) => (
              <option key={f._id} value={f._id}>{f.name} ({f.subject})</option>
            ))}
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
          <input type="number" className="input" value={year} onChange={(e) => onYearChange(+e.target.value)} style={{ width: 90 }} />
        </div>
      </div>
    </div>
  )
}
