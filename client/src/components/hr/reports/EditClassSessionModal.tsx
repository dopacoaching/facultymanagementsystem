import type { Session } from '@/types'
import { BreakRows, breaksFromMinutes, type BreaksInput } from '@/components/coordinator/log-session'

export interface EditClassSessionForm {
  subject: string
  chapter: string
  classMode: 'ONLINE' | 'OFFLINE' | 'ONLINE_DOUBT_CLEARANCE' | 'OFFLINE_DOUBT_CLEARANCE' | ''
  updatedByName: string
  startTime: string
  endTime: string
  breaks: BreaksInput
  sessionDate: string
}

export function formFromSession(s: Session): EditClassSessionForm {
  return {
    subject:       s.subject,
    chapter:       s.chapter,
    classMode:     s.classMode ?? '',
    updatedByName: s.updatedByName ?? '',
    startTime:     s.startTime ?? '',
    endTime:       s.endTime ?? '',
    // 0 / absent ⇒ Nil row; the manager re-confirms any real value here.
    breaks:        breaksFromMinutes(s.breakMinutes, s.lunchBreakMinutes, s.afternoonBreakMinutes),
    sessionDate:   s.sessionDate.slice(0, 10),
  }
}

const CLASS_MODE_OPTIONS = [
  { value: 'ONLINE',                  label: 'Online' },
  { value: 'OFFLINE',                 label: 'Offline' },
  { value: 'ONLINE_DOUBT_CLEARANCE',  label: 'Online Doubt Clearance' },
  { value: 'OFFLINE_DOUBT_CLEARANCE', label: 'Offline Doubt Clearance' },
] as const

interface EditClassSessionModalProps {
  form: EditClassSessionForm
  setForm: (updater: (f: EditClassSessionForm) => EditClassSessionForm) => void
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function EditClassSessionModal({
  form, setForm, error, saving, onClose, onSubmit,
}: EditClassSessionModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Edit Class Session"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <h2>Edit Class Session</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
          <div className="input-group-3">
            <div className="form-group">
              <label className="label">Subject</label>
              <input className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Chapter</label>
              <input className="input" value={form.chapter} onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Class Mode</label>
              <select className="input" value={form.classMode}
                onChange={(e) => setForm((f) => ({ ...f, classMode: e.target.value as EditClassSessionForm['classMode'] }))}>
                <option value="">— select —</option>
                {CLASS_MODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Session Date</label>
              <input type="date" className="input" value={form.sessionDate}
                onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Updated By</label>
              <input className="input" value={form.updatedByName} onChange={(e) => setForm((f) => ({ ...f, updatedByName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">End Time</label>
              <input type="time" className="input" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <BreakRows breaks={form.breaks} onBreaksChange={(b) => setForm((f) => ({ ...f, breaks: b }))} />
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
