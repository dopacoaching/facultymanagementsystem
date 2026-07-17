import { addDays } from '@/utils/date'

interface Campus {
  _id: string
  name: string
}

interface TimetableFilterBarProps {
  selectedDate: string
  onDateChange: (date: string) => void
  filterCampusId: string
  onCampusChange: (campusId: string) => void
  campuses: Campus[]
  today: string
}

export function TimetableFilterBar({
  selectedDate, onDateChange, filterCampusId, onCampusChange, campuses, today,
}: TimetableFilterBarProps) {
  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '0.875rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label" style={{ marginBottom: '0.25rem' }}>Date</label>
          <input type="date" className="input" value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)} style={{ minWidth: 160 }} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label" style={{ marginBottom: '0.25rem' }}>Campus</label>
          <select className="input" value={filterCampusId} onChange={(e) => onCampusChange(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">All IG Campuses</option>
            {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm"
            onClick={() => onDateChange(addDays(selectedDate, -1))}>‹ Prev</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDateChange(today)}>Today</button>
          <button className="btn btn-ghost btn-sm"
            onClick={() => onDateChange(addDays(selectedDate, 1))}>Next ›</button>
        </div>
      </div>
    </div>
  )
}
