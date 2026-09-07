import type { Session } from '@/types'
import { BreakRows, breaksFromMinutes, type BreaksInput } from '@/components/coordinator/log-session'

export interface EditIGSessionForm {
  subject: string
  chapter: string
  timeSlot: 'SESSION_1' | 'SESSION_2' | 'SESSION_3' | ''
  updatedByName: string
  startTime: string
  endTime: string
  breaks: BreaksInput
  sessionDate: string
}

export function formFromIGSession(s: Session): EditIGSessionForm {
  return {
    subject:       s.subject,
    chapter:       s.chapter,
    timeSlot:      (s.timeSlot as EditIGSessionForm['timeSlot']) ?? '',
    updatedByName: s.updatedByName ?? '',
    startTime:     s.startTime ?? '',
    endTime:       s.endTime ?? '',
    breaks:        breaksFromMinutes(s.breakMinutes, s.lunchBreakMinutes, s.afternoonBreakMinutes),
    sessionDate:   s.sessionDate.slice(0, 10),
  }
}

const SLOT_OPTIONS = [
  { value: 'SESSION_1', label: 'Session 1' },
  { value: 'SESSION_2', label: 'Session 2' },
  { value: 'SESSION_3', label: 'Other' },
] as const

interface EditIGSessionReportModalProps {
  form: EditIGSessionForm
  setForm: (updater: (f: EditIGSessionForm) => EditIGSessionForm) => void
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function EditIGSessionReportModal({
  form, setForm, error, saving, onClose, onSubmit,
}: EditIGSessionReportModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Edit IG Session"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel modal-md">
        <div className="modal-header">
          <h2>Edit IG Session</h2>
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
              <label className="label">Session Slot</label>
              <select className="input" value={form.timeSlot}
                onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value as EditIGSessionForm['timeSlot'] }))}>
                <option value="">— select —</option>
                {SLOT_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
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
