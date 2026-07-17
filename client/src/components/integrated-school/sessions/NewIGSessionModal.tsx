import { todayLocal } from '@/utils/date'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { ISBatchChapter, NewIGSessionForm } from './types'

interface NewIGSessionModalProps {
  form: NewIGSessionForm
  setForm: (updater: (f: NewIGSessionForm) => NewIGSessionForm) => void
  facultyList: Faculty[]
  batches: Batch[]
  isCoordinator: boolean
  loadingIgCh: boolean
  igSubjects: string[]
  igFilteredChapters: ISBatchChapter[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function NewIGSessionModal({
  form, setForm, facultyList, batches, isCoordinator, loadingIgCh,
  igSubjects, igFilteredChapters, error, saving, onClose, onSubmit,
}: NewIGSessionModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Log IG Session"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, margin: 0 }}>Log IG Session</h2>
          <button onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} /></div>}
          <div className="input-group-3">
            <div className="form-group">
              <label className="label">Faculty</label>
              <select className="input" value={form.facultyId}
                onChange={(e) => {
                  const fac = facultyList.find((f) => f._id === e.target.value)
                  setForm((f) => {
                    const newSubject = fac?.subject ?? f.subject
                    return { ...f, facultyId: e.target.value, subject: newSubject, chapter: newSubject !== f.subject ? '' : f.chapter }
                  })
                }}>
                <option value="">— select —</option>
                {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">IG Batch</label>
              <select className="input" value={form.batchId}
                onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value, subject: '', chapter: '' }))}
                disabled={isCoordinator}>
                <option value="">— select —</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Subject</label>
              {loadingIgCh ? (
                <div className="input" style={{ color: 'var(--color-muted)' }}>Loading…</div>
              ) : igSubjects.length > 0 ? (
                <select className="input" value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '' }))}>
                  <option value="">— select subject —</option>
                  {igSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input className="input" value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '' }))}
                  placeholder="e.g. Physics" />
              )}
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Chapter</label>
              {loadingIgCh ? (
                <div className="input" style={{ color: 'var(--color-muted)' }}>Loading chapters…</div>
              ) : igFilteredChapters.length > 0 ? (
                <select className="input" value={form.chapter}
                  onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))}>
                  <option value="">— select chapter —</option>
                  {igFilteredChapters.map((ch) => {
                    const done      = ch.status === 'COMPLETED'
                    const cancelled = ch.status === 'CANCELLED'
                    const suffix    = done ? ' ✓' : cancelled ? ' ✗' : ''
                    return (
                      <option key={ch._id} value={ch.chapterName} disabled={cancelled}>
                        {ch.chapterName}{suffix}
                      </option>
                    )
                  })}
                </select>
              ) : (
                <input className="input" value={form.chapter}
                  onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))}
                  placeholder={form.subject ? 'Enter chapter or topic' : 'Select a subject first'} />
              )}
            </div>
            <div className="form-group">
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Duration (hours)</label>
              <input type="number" className="input" value={form.durationHours} min="0.25" max="8" step="0.25"
                placeholder="e.g. 1.5" onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Session Date</label>
              <input type="date" className="input" value={form.sessionDate}
                max={todayLocal()}
                onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
