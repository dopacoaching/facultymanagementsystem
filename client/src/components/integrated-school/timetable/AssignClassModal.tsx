import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { IGSessionSlot, IGSessionType, ISChapter, SESSION_SLOTS, SESSION_TYPES, fmtDate } from './types'

export interface AssignClassForm {
  batchId:         string
  campusId:        string
  facultyId:       string
  subject:         string
  chapter:         string
  examTopic:       string
  startTime:       string
  timeSlot:        IGSessionSlot
  sessionType:     IGSessionType
  durationHours:   string | number
  durationMinutes: number
  notes:           string
  isUnplanned:     boolean
}

interface AssignClassModalProps {
  selectedDate: string
  form: AssignClassForm
  setForm: (updater: (f: AssignClassForm) => AssignClassForm) => void
  isIsBatches: Batch[]
  facultyList: Faculty[]
  availableSubjects: string[]
  availableChapters: ISChapter[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function AssignClassModal({
  selectedDate, form, setForm, isIsBatches, facultyList, availableSubjects, availableChapters,
  error, saving, onClose, onSubmit,
}: AssignClassModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Assign IG Class"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 600, border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 700, margin: 0 }}>Assign IG Class</h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(selectedDate)}</p>
          </div>
          <button onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} /></div>}
          <div className="input-group">
            <div className="form-group">
              <label className="label">IG Batch</label>
              <select className="input" autoFocus value={form.batchId}
                onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value, subject: '', chapter: '' }))}>
                <option value="">— select —</option>
                {isIsBatches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Session Slot</label>
              <select className="input" value={form.timeSlot}
                onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value as IGSessionSlot }))}>
                {SESSION_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Session Type</label>
              <select className="input" value={form.sessionType}
                onChange={(e) => setForm((f) => ({ ...f, sessionType: e.target.value as IGSessionType, chapter: '', examTopic: '' }))}>
                {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Subject</label>
              {availableSubjects.length > 0 ? (
                <select className="input" value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '', examTopic: '' }))}>
                  <option value="">— select subject —</option>
                  {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input className="input" value={form.subject} placeholder="e.g. Physics"
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '', examTopic: '' }))} />
              )}
            </div>
            {/* Chapter — only for live sessions */}
            {(form.sessionType === 'LIVE_SESSION') && (
              <div className="form-group">
                <label className="label">Chapter</label>
                {availableChapters.length > 0 ? (
                  <select className="input" value={form.chapter}
                    onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))}>
                    <option value="">— select chapter —</option>
                    {availableChapters.map((c) => <option key={c._id} value={c.chapterName}>{c.chapterName}</option>)}
                  </select>
                ) : (
                  <input className="input" value={form.chapter} placeholder="Chapter name"
                    onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))} />
                )}
              </div>
            )}
            {/* Exam topic — for exams */}
            {(form.sessionType === 'WEEKLY_EXAM' || form.sessionType === 'MONTHLY_EXAM') && (
              <div className="form-group">
                <label className="label">Exam Topic (optional)</label>
                <input className="input" value={form.examTopic}
                  placeholder={`e.g. ${form.subject || 'Physics'} — Chapters 1–3`}
                  onChange={(e) => setForm((f) => ({ ...f, examTopic: e.target.value }))} />
              </div>
            )}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Faculty (optional)</label>
              <select className="input" value={form.facultyId}
                onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                <option value="">— unassigned —</option>
                {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.subject})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Planned Duration</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" className="input" min={0} max={12} step={1}
                  style={{ width: '5rem' }} placeholder="hrs"
                  value={form.durationHours}
                  onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))} />
                <select className="input" style={{ width: '5rem' }}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: +e.target.value }))}>
                  {[0,5,10,15,20,25,30,35,40,45,50,55].map((m) => (
                    <option key={m} value={m}>{m}m</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Notes (optional)</label>
              <input className="input" value={form.notes} placeholder="Any notes…"
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="isUnplanned" checked={form.isUnplanned}
                onChange={(e) => setForm((f) => ({ ...f, isUnplanned: e.target.checked }))} />
              <label htmlFor="isUnplanned" className="label" style={{ margin: 0 }}>
                Mark as unplanned (logged after-the-fact)
              </label>
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Assign Class'}
          </button>
        </div>
      </div>
    </div>
  )
}
