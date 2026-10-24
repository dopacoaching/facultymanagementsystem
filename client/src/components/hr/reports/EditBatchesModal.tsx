import { useState } from 'react'
import { BatchPicker, type BatchChoice } from './BatchPicker'

/** HR/Admin: change or add the batches an entry was for, straight from the entries report. */
export function EditBatchesModal({ title, batches, initial, onClose, onSave }: {
  title: string
  batches: BatchChoice[]
  initial: string[]
  onClose: () => void
  onSave: (ids: string[]) => Promise<void>
}) {
  const [ids, setIds] = useState<string[]>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (ids.length === 0) { setError('Select at least one batch'); return }
    setSaving(true); setError('')
    try { await onSave(ids) } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update the batches')
    } finally { setSaving(false) }
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Edit batches"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <h2>Edit batches</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit() }}>
          <div className="modal-body">
            <p style={{ marginTop: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{title}</p>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
            <BatchPicker batches={batches} value={ids} onChange={setIds} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
