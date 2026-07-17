import { todayLocal } from '@/utils/date'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { BatchChapter, MONTH_NAMES, NewSessionForm, SyllabusChapter } from './types'

interface NewSessionModalProps {
  form: NewSessionForm
  setForm: (updater: (f: NewSessionForm) => NewSessionForm) => void
  facultyList: Faculty[]
  batches: Batch[]
  otherSubjects: string[]
  needsVideoFirst: boolean
  formBatchType: string
  needsSessionCategory: boolean
  loadingCh: boolean
  loadingSyllabus: boolean
  syllabusChapters: SyllabusChapter[]
  syllabusChaptersByMonth: Record<number, SyllabusChapter[]>
  chapters: BatchChapter[]
  error: string
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}

export function NewSessionModal({
  form, setForm, facultyList, batches, otherSubjects, needsVideoFirst, formBatchType,
  needsSessionCategory, loadingCh, loadingSyllabus, syllabusChapters, syllabusChaptersByMonth,
  chapters, error, saving, onClose, onSubmit,
}: NewSessionModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Log New Session"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 620, border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, margin: 0 }}>Log New Session</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}

          {needsVideoFirst && (
            <div className="alert" style={{ marginBottom: '1rem', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--color-warning)', padding: '0.75rem 1rem' }}>
              <span style={{ marginRight: '0.5rem' }}>🎬</span>
              <strong>{formBatchType}</strong> batch — only video-complete chapters can be logged.
            </div>
          )}

          <div className="input-group">
            <div className="form-group">
              <label className="label">Faculty</label>
              <select className="input" autoFocus value={form.facultyId} onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                <option value="">— select —</option>
                {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
            {needsSessionCategory && (
              <div className="form-group">
                <label className="label">Session Category</label>
                <select className="input" value={form.sessionCategory}
                  onChange={(e) => setForm((f) => ({ ...f, sessionCategory: e.target.value as 'CLASS' | 'DOUBT_CLEARANCE' }))}>
                  <option value="CLASS">Class</option>
                  <option value="DOUBT_CLEARANCE">Doubt Clearance</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="label">Batch</label>
              <select className="input" value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value, subject: '', chapter: '', syllabusChapterId: undefined }))}>
                <option value="">— select —</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Subject</label>
              <select className="input" value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '', syllabusChapterId: undefined }))}>
                <option value="">— select subject —</option>
                <option value="PHYSICS">Physics</option>
                <option value="CHEMISTRY">Chemistry</option>
                <option value="BIOLOGY">Biology</option>
                {otherSubjects.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Chapter</label>
              {(loadingCh || loadingSyllabus) ? (
                <div className="input" style={{ color: 'var(--color-muted)' }}>Loading chapters…</div>
              ) : syllabusChapters.length > 0 ? (
                <>
                  <select className="input" value={form.chapter}
                    onChange={(e) => {
                      const ch = syllabusChapters.find((c) => c.chapterName === e.target.value)
                      setForm((f) => ({ ...f, chapter: e.target.value, syllabusChapterId: ch?._id ?? undefined }))
                    }}>
                    <option value="">— select chapter —</option>
                    {Object.entries(syllabusChaptersByMonth)
                      .sort(([a], [b]) => +a - +b)
                      .map(([month, chs]) => (
                        <optgroup key={month} label={MONTH_NAMES[+month] ?? `Month ${month}`}>
                          {chs.map((ch) => {
                            const bc = chapters.find((b) =>
                              (b.syllabusChapterId && b.syllabusChapterId === ch._id) ||
                              b.chapterName === ch.chapterName
                            )
                            const done     = bc?.facultyClassDone
                            const videoOk  = !needsVideoFirst || bc?.videoComplete
                            const disabled = Boolean(done) || (needsVideoFirst && !videoOk)
                            const suffix   = done ? ' ✓' : needsVideoFirst && !videoOk ? ' 🔒' : ''
                            return (
                              <option key={ch._id} value={ch.chapterName} disabled={disabled}>
                                {ch.chapterName}{suffix}
                              </option>
                            )
                          })}
                        </optgroup>
                      ))}
                  </select>
                  {needsVideoFirst && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', margin: '0.25rem 0 0' }}>
                      🔒 Video not yet complete &nbsp;·&nbsp; ✓ Already logged
                    </p>
                  )}
                </>
              ) : (
                <input className="input" value={form.chapter}
                  onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))}
                  placeholder={form.subject ? 'Enter chapter or topic' : 'Select a subject first'} />
              )}
            </div>
            <div className="form-group">
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Duration</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number" className="input" min={0} max={12} style={{ width: '5rem' }}
                  value={form.durationHours}
                  onChange={(e) => setForm((f) => ({ ...f, durationHours: Math.max(0, +e.target.value) }))}
                  aria-label="Duration hours" placeholder="hrs"
                />
                <select
                  className="input" style={{ width: '5rem' }}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: +e.target.value }))}
                  aria-label="Duration minutes"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>{m}m</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Session Date</label>
              <input type="date" className="input" value={form.sessionDate} max={todayLocal()} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving || (needsVideoFirst && !form.chapter)}>
            {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
