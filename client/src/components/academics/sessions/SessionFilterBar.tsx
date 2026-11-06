import type { Batch } from '@/services/faculty.service'
import { Icon } from '@/components/ui/Icon'
import { MONTHS, STATUS_OPTIONS } from './types'
import s from './Sessions.module.css'

interface SessionFilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  filterBatch: string
  onBatchChange: (v: string) => void
  batches: Batch[]
  statusFilter: string
  onStatusChange: (v: string) => void
  filterMonth: number
  onMonthChange: (v: number) => void
  filterYear: number
  onYearChange: (v: number) => void
  years: number[]
  onClear: () => void
}

export function SessionFilterBar({
  search, onSearchChange, filterBatch, onBatchChange, batches,
  statusFilter, onStatusChange, filterMonth, onMonthChange,
  filterYear, onYearChange, years, onClear,
}: SessionFilterBarProps) {
  const hasActiveFilter = search || statusFilter !== 'ALL' || filterMonth > 0 || filterYear > 0 || filterBatch

  return (
    <div className={`toolbar ${s.toolbar}`} role="search">
      <div className={`form-group ${s.search}`}>
        <label className="label" htmlFor="sess-search">Search</label>
        <div className={s.searchField}>
          <Icon name="search" size={16} className={s.searchIcon} />
          <input id="sess-search" className={`input ${s.searchInput}`} placeholder="Faculty, subject, chapter" value={search}
            onChange={(e) => onSearchChange(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="label" htmlFor="sess-batch">Batch</label>
        <select id="sess-batch" className="input" value={filterBatch} onChange={(e) => onBatchChange(e.target.value)}>
          <option value="">All Batches</option>
          {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label" htmlFor="sess-status">Status</label>
        <select id="sess-status" className="input" value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>{st === 'ALL' ? 'All Statuses' : st.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="label" htmlFor="sess-month">Month</label>
        <select id="sess-month" className="input" value={filterMonth} onChange={(e) => onMonthChange(+e.target.value)}>
          <option value={0}>All Months</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label" htmlFor="sess-year">Year</label>
        <select id="sess-year" className="input" value={filterYear} onChange={(e) => onYearChange(+e.target.value)}>
          <option value={0}>All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {hasActiveFilter && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          <Icon name="x" size={14} /> Clear
        </button>
      )}
    </div>
  )
}
