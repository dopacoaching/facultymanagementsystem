import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Batch } from '@/services/faculty.service'

interface BatchSelectorProps {
  batchLocked: boolean
  assignedBatch: Batch | undefined
  needsVideoFirst: boolean
  batches: Batch[]
  value: string
  onChange: (batchId: string) => void
}

export function BatchSelector({ batchLocked, assignedBatch, needsVideoFirst, batches, value, onChange }: BatchSelectorProps) {
  return (
    <div className="form-group">
      <label className="label">Campus / Batch</label>
      {batchLocked ? (
        <div style={{
          padding: '0.6rem 0.875rem',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9375rem',
          color: 'var(--color-text)',
          fontWeight: 500,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{assignedBatch?.name ?? 'Your assigned campus'}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 400 }}>
            {assignedBatch?.type ?? ''}
            {needsVideoFirst && <span style={{ marginLeft: '0.5rem', color: 'var(--color-warning)' }}>🎬 Video-first</span>}
          </span>
        </div>
      ) : (
        <select
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— select campus/batch —</option>
          {batches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name} ({b.type}{isVideoFirstBatch(b.type) ? ' 🎬' : ''})
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
