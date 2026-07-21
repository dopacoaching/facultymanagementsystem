import type { Batch } from '@/services/faculty.service'
import { ALL_STATUSES, STATUS_LABEL, SUBGROUP_LABEL } from './types'
import type { ChapterStatus } from './types'

interface ISChaptersFilterBarProps {
  batches: Batch[]
  selectedBatch: string
  onBatchChange: (id: string) => void
  subjects: string[]
  filterSubject: string
  onFilterSubjectChange: (s: string) => void
  filterStatus: ChapterStatus | 'ALL'
  onFilterStatusChange: (s: ChapterStatus | 'ALL') => void
  onClearFilters: () => void
}

export function ISChaptersFilterBar({
  batches, selectedBatch, onBatchChange, subjects, filterSubject, onFilterSubjectChange,
  filterStatus, onFilterStatusChange, onClearFilters,
}: ISChaptersFilterBarProps) {
  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '0.875rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
          <label className="label" style={{ marginBottom: '0.25rem' }}>IG Batch</label>
          <select className="input" value={selectedBatch}
            onChange={(e) => { onBatchChange(e.target.value); onFilterSubjectChange('') }}>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}{b.ig1Subgroup ? ` (${SUBGROUP_LABEL[b.ig1Subgroup] ?? b.ig1Subgroup})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
          <label className="label" style={{ marginBottom: '0.25rem' }}>Subject</label>
          <select className="input" value={filterSubject} onChange={(e) => onFilterSubjectChange(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
          <label className="label" style={{ marginBottom: '0.25rem' }}>Status</label>
          <select className="input" value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value as ChapterStatus | 'ALL')}>
            <option value="ALL">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        {(filterSubject || filterStatus !== 'ALL') && (
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: '0.125rem' }}
            onClick={onClearFilters}>Clear Filters</button>
        )}
      </div>
    </div>
  )
}
