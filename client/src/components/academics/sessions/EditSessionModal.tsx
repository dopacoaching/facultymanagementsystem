import { todayLocal } from '@/utils/date'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { Icon } from '@/components/ui/Icon'
import s from './Sessions.module.css'
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
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close"><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <div className="modal-body">
          {error && <div className={`alert alert-error ${s.modalAlert}`} role="alert"><Icon name="alert" size={16} className="alert-icon" />{error}</div>}
          <div className="input-group-3">
            <div className="form-group">
              <label className="label" htmlFor="es-faculty">Faculty</label>
              <select id="es-faculty" className="input" value={form.facultyId} onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                <option value="">— select —</option>
                {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="es-batch">Batch</label>
              <select id="es-batch" className="input" value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}>
                <option value="">— select —</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="es-subject">Subject</label>
              <input id="es-subject" className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className={`form-group ${s.spanTwo}`}>
              <label className="label" htmlFor="es-chapter">Chapter</label>
              <input id="es-chapter" className="input" value={form.chapter} onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="es-date">Session Date</label>
              <input id="es-date" type="date" className="input" value={form.sessionDate} max={todayLocal()} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="es-dur">Duration (hours)</label>
              <input id="es-dur" type="number" className="input" min={0.25} max={12} step={0.25}
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
