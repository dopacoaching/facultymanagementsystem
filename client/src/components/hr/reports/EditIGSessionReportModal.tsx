import type { Session } from '@/types'
import { SUBJECT_OPTIONS } from '@/components/coordinator/log-session/types'
import { ChapterChips } from '@/components/coordinator/log-session/ChapterChips'
import { BatchPicker, type BatchChoice } from './BatchPicker'
import { BreakRows, breaksFromMinutes, type BreaksInput } from '@/components/coordinator/log-session'

export interface EditIGSessionForm {
  facultyId: string
  subject: string
  chapters: string[]
  timeSlot: 'SESSION_1' | 'SESSION_2' | 'SESSION_3' | ''
  updatedByName: string
  comment: string
  startTime: string
  endTime: string
  breaks: BreaksInput
  sessionDate: string
}

export function formFromIGSession(s: Session): EditIGSessionForm {
  return {
    facultyId:     typeof s.facultyId === 'object' ? s.facultyId._id : s.facultyId,
    subject:       s.subject,
    chapters:      s.chapters?.length ? s.chapters : s.chapter ? [s.chapter] : [],
    timeSlot:      (s.timeSlot as EditIGSessionForm['timeSlot']) ?? '',
    updatedByName: s.updatedByName ?? '',
    comment:       s.comment ?? '',
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
  /** HR/Admin: change which batches sat the class. */
  /** Chapters the subject offers, suggested while typing. */
  chapterOptions?: string[]
  /** Active faculty to choose from; omit to hide the selector. */
  faculty?: { _id: string; name: string; subject: string }[]
  batches?: BatchChoice[]
  batchIds?: string[]
  onBatchIdsChange?: (ids: string[]) => void
}

export function EditIGSessionReportModal({
  form, setForm, error, saving, onClose, onSubmit, chapterOptions, faculty, batches, batchIds, onBatchIdsChange,
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
            {faculty && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Faculty</label>
                <select className="input" value={form.facultyId} onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}>
                  {!faculty.some((x) => x._id === form.facultyId) && <option value={form.facultyId}>(current faculty)</option>}
                  {faculty.map((x) => <option key={x._id} value={x._id}>{x.name} — {x.subject}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="label">Subject</label>
              <select
                className="input"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapters: f.subject === e.target.value ? f.chapters : [] }))}
              >
                {!SUBJECT_OPTIONS.some((o) => o.value === form.subject) && <option value={form.subject}>{form.subject}</option>}
                {SUBJECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="label">Chapters</label>
              <ChapterChips value={form.chapters} onChange={(v) => setForm((f) => ({ ...f, chapters: v }))} options={chapterOptions} restrict={!!chapterOptions} />
            </div>
            {batches && batches.length > 0 && batchIds && onBatchIdsChange && (
              <BatchPicker batches={batches} value={batchIds} onChange={onBatchIdsChange} />
            )}
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
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Comment</label>
              <textarea className="input" rows={2} maxLength={500} value={form.comment} style={{ resize: 'vertical' }}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
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
