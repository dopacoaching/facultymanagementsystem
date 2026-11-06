import { todayLocal } from '@/utils/date'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { Icon } from '@/components/ui/Icon'
import s from './Sessions.module.css'
import { BatchChapter, MONTH_NAMES, NewSessionForm, SyllabusChapter } from './types'

interface NewSessionModalProps {
  form: NewSessionForm
  setForm: (updater: (f: NewSessionForm) => NewSessionForm) => void
  facultyList: Faculty[]
  batches: Batch[]
  otherSubjects: string[]
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
  form, setForm, facultyList, batches, otherSubjects,
  needsSessionCategory, loadingCh, loadingSyllabus, syllabusChapters, syllabusChaptersByMonth,
  chapters, error, saving, onClose, onSubmit,
}: NewSessionModalProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Log New Session"
      className="modal-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="modal-panel modal-lg">
        <div className="modal-header">
          <h2>Log New Session</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="modal-close"><Icon name="x" size={16} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <div className="modal-body">
          {error && <div className={`alert alert-error ${s.modalAlert}`} role="alert"><Icon name="alert" size={16} className="alert-icon" />{error}</div>}

          <div className="input-group">
            <div className="form-group">
              <label className="label" htmlFor="ns-faculty">Faculty</label>
              <select id="ns-faculty" className="input" autoFocus value={form.facultyId} onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                <option value="">— select —</option>
                {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
            {needsSessionCategory && (
              <div className="form-group">
                <label className="label" htmlFor="ns-category">Session Category</label>
                <select id="ns-category" className="input" value={form.sessionCategory}
                  onChange={(e) => setForm((f) => ({ ...f, sessionCategory: e.target.value as 'CLASS' | 'DOUBT_CLEARANCE' }))}>
                  <option value="CLASS">Class</option>
                  <option value="DOUBT_CLEARANCE">Doubt Clearance</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="label" htmlFor="ns-batch">Batch</label>
              <select id="ns-batch" className="input" value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value, subject: '', chapter: '', syllabusChapterId: undefined }))}>
                <option value="">— select —</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ns-subject">Subject</label>
              <select id="ns-subject" className="input" value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '', syllabusChapterId: undefined }))}>
                <option value="">— select subject —</option>
                <option value="PHYSICS">Physics</option>
                <option value="CHEMISTRY">Chemistry</option>
                <option value="BIOLOGY">Biology</option>
                {otherSubjects.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ns-chapter">Chapter</label>
              {(loadingCh || loadingSyllabus) ? (
                <div className={`input ${s.loadingField}`} aria-live="polite"><span className="spinner" /> Loading chapters…</div>
              ) : syllabusChapters.length > 0 ? (
                <>
                  <select id="ns-chapter" className="input" value={form.chapter}
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
                            const done   = bc?.facultyClassDone
                            const suffix = done ? ' ✓' : ''
                            return (
                              <option key={ch._id} value={ch.chapterName} disabled={Boolean(done)}>
                                {ch.chapterName}{suffix}
                              </option>
                            )
                          })}
                        </optgroup>
                      ))}
                  </select>
                </>
              ) : (
                <input id="ns-chapter" className="input" value={form.chapter}
                  onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))}
                  placeholder={form.subject ? 'Enter chapter or topic' : 'Select a subject first'} />
              )}
            </div>
            <div className="form-group">
              <label className="label" htmlFor="ns-start">Start Time</label>
              <input id="ns-start" type="time" className="input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <span className="label" id="ns-dur-label">Duration</span>
              <div className={s.durationRow} role="group" aria-labelledby="ns-dur-label">
                <input
                  type="number" className={`input ${s.durationHours}`} min={0} max={12}
                  value={form.durationHours}
                  onChange={(e) => setForm((f) => ({ ...f, durationHours: Math.max(0, +e.target.value) }))}
                  aria-label="Duration hours" placeholder="hrs"
                />
                <select
                  className={`input ${s.durationMins}`}
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
              <label className="label" htmlFor="ns-date">Session Date</label>
              <input id="ns-date" type="date" className="input" value={form.sessionDate} max={todayLocal()} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Create Session'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
