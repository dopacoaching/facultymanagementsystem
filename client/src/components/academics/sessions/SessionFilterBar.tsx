import type { Batch } from '@/services/faculty.service'
import { MONTHS, STATUS_OPTIONS } from './types'

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
    <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }}>🔍</span>
          <input className="input" placeholder="Search faculty, subject, chapter…" value={search}
            onChange={(e) => onSearchChange(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select className="input" value={filterBatch} onChange={(e) => onBatchChange(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All Batches</option>
          {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} style={{ minWidth: 140 }}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select className="input" value={filterMonth} onChange={(e) => onMonthChange(+e.target.value)} style={{ minWidth: 110 }}>
          <option value={0}>All Months</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="input" value={filterYear} onChange={(e) => onYearChange(+e.target.value)} style={{ minWidth: 100 }}>
          <option value={0}>All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {hasActiveFilter && (
          <button className="btn btn-ghost btn-sm" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
