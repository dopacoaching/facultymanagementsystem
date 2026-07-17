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
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, margin: 0 }}>Edit Session</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
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
