import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { ClassEntry } from './types'
import { ScheduleEntryRow } from './ScheduleEntryRow'

interface ScheduleEntryFormProps {
  batches: Batch[]
  faculty: Faculty[]
  batchId: string
  onBatchChange: (id: string) => void
  isCoordinator: boolean
  entries: ClassEntry[]
  onUpdateEntry: (idx: number, key: keyof ClassEntry, val: string) => void
  onAddEntry: () => void
  onRemoveEntry: (idx: number) => void
  error: string
  success: string
  saving: boolean
  onSave: () => void
}

export function ScheduleEntryForm({
  batches, faculty, batchId, onBatchChange, isCoordinator,
  entries, onUpdateEntry, onAddEntry, onRemoveEntry,
  error, success, saving, onSave,
}: ScheduleEntryFormProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>
        Create / Update Schedule
      </h2>

      {error   && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} /></div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}><span className="alert-icon">✅</span>{success}</div>}

      <div style={{ marginBottom: '1.5rem', maxWidth: 320 }}>
        <div className="form-group">
          <label className="label">Batch</label>
          <select className="input" value={batchId} onChange={(e) => onBatchChange(e.target.value)}
            disabled={isCoordinator}>
            <option value="">— select batch —</option>
            {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            📚 Class Entries — Live Sessions &amp; Recorded Videos
          </h3>
          <button className="btn btn-outline btn-sm" onClick={onAddEntry}>+ Add Row</button>
        </div>
        {entries.map((entry, idx) => (
          <ScheduleEntryRow key={idx} entry={entry} idx={idx} faculty={faculty}
            onUpdate={onUpdateEntry} onRemove={onRemoveEntry} />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : '💾 Save Schedule'}
        </button>
      </div>
    </div>
  )
}
