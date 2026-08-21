import type { Session } from '@/types'

export interface EditIGSessionForm {
  subject: string
  chapter: string
  timeSlot: 'SESSION_1' | 'SESSION_2' | 'SESSION_3' | ''
  updatedByName: string
  startTime: string
  endTime: string
  noBreak: boolean
  breakMinutes: string
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
    noBreak:       s.breakMinutes === 0,
    breakMinutes:  s.breakMinutes ? String(s.breakMinutes) : '',
    sessionDate:   s.sessionDate.slice(0, 10),
  }
}

const SLOT_OPTIONS = [
  { value: 'SESSION_1', label: 'Session 1' },
  { value: 'SESSION_2', label: 'Session 2' },
  { value: 'SESSION_3', label: 'Session 3' },
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, margin: 0 }}>Edit IG Session</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
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
            <div className="form-group">
              <label className="label">Break</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={form.breakMinutes}
                  disabled={form.noBreak}
                  placeholder="Minutes"
                  style={{ opacity: form.noBreak ? 0.5 : 1 }}
                  onChange={(e) => setForm((f) => ({ ...f, breakMinutes: e.target.value }))}
                />
                <button
                  type="button"
                  className={`btn ${form.noBreak ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setForm((f) => ({ ...f, noBreak: !f.noBreak, breakMinutes: !f.noBreak ? '' : f.breakMinutes }))}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Nil
                </button>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
