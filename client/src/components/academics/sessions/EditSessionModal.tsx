import { todayLocal } from '@/utils/date'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { EditSessionForm } from './types'

interface EditSessionModalProps {
  form: EditSessionForm
  setForm: (updater: (f: EditSessionForm) => EditSessionForm) => void
  facultyList: Faculty[]
  batches: Batch[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function EditSessionModal({
  form, setForm, facultyList, batches, error, saving, onClose, onSubmit,
}: EditSessionModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Edit Session"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <h2>Edit Session</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
          <div className="input-group-3">
            <div className="form-group">
              <label className="label">Faculty</label>
              <select className="input" value={form.facultyId} onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                <option value="">— select —</option>
                {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Batch</label>
              <select className="input" value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}>
                <option value="">— select —</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Subject</label>
              <input className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Chapter</label>
              <input className="input" value={form.chapter} onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Session Date</label>
              <input type="date" className="input" value={form.sessionDate} max={todayLocal()} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Duration (hours)</label>
              <input type="number" className="input" min={0.25} max={12} step={0.25}
                value={form.durationHours}
                onChange={(e) => setForm((f) => ({ ...f, durationHours: +e.target.value }))} />
            </div>
          </div>
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
