import type { Batch } from '@/services/faculty.service'

interface ChaptersFilterBarProps {
  batches: Batch[]
  batchId: string
  onBatchChange: (id: string) => void
  isCoordinator: boolean
  subjectFilter: string
  onSubjectChange: (s: string) => void
  subjects: string[]
}

export function ChaptersFilterBar({
  batches, batchId, onBatchChange, isCoordinator, subjectFilter, onSubjectChange, subjects,
}: ChaptersFilterBarProps) {
  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Batch</label>
          <select className="input" value={batchId}
            onChange={(e) => { onBatchChange(e.target.value); onSubjectChange('') }}
            style={{ minWidth: 200 }}
            disabled={isCoordinator}>
            {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Subject</label>
          <select className="input" value={subjectFilter} onChange={(e) => onSubjectChange(e.target.value)} style={{ minWidth: 150 }}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {subjectFilter && (
          <button className="btn btn-ghost btn-sm" onClick={() => onSubjectChange('')}>Clear</button>
        )}
      </div>
    </div>
  )
}
