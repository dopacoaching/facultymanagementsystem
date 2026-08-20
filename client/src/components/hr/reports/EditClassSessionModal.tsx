import type { Session } from '@/types'

export interface EditClassSessionForm {
  subject: string
  chapter: string
  classMode: 'ONLINE' | 'OFFLINE' | 'ONLINE_DOUBT_CLEARANCE' | 'OFFLINE_DOUBT_CLEARANCE' | ''
  updatedByName: string
  startTime: string
  endTime: string
  breakMinutes: string
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
    breakMinutes:  s.breakMinutes != null ? String(s.breakMinutes) : '',
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, margin: 0 }}>Edit Class Session</h2>
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
            <div className="form-group">
              <label className="label">Break (minutes)</label>
              <input type="number" className="input" min={0} value={form.breakMinutes}
                onChange={(e) => setForm((f) => ({ ...f, breakMinutes: e.target.value }))} />
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
