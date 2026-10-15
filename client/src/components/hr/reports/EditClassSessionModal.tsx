import type { Session } from '@/types'
import { ENTRY_TYPES, ENTRY_TYPE_LABELS, type EntryType } from '@/lib/constants/entryTypes'
import { BreakRows, breaksFromMinutes, type BreaksInput } from '@/components/coordinator/log-session'

export interface EditClassSessionForm {
  /** Studio entries only; '' hides the selector. */
  entryType: EntryType | ''
  /** Shoot entries: time taken as whole hours + minutes (no start/end/break). */
  shootHours: string
  shootMinutes: string
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
  // A Shoot is edited by the time actually taken, not the multiplied hours.
  const rawMins = s.entryType === 'SHOOT' ? Math.round((s.rawDurationHours ?? s.durationHours) * 60) : 0
  return {
    entryType:     s.entryType ?? '',
    shootHours:    s.entryType === 'SHOOT' ? String(Math.floor(rawMins / 60)) : '',
    shootMinutes:  s.entryType === 'SHOOT' ? String(rawMins % 60) : '',
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
  /** Teacher edits: pick "Updated by" from the campus's teachers instead of free text. */
  teacherNames?: string[]
  /** Latest selectable date (teachers can't back-date into the future). */
  maxDate?: string
}

export function EditClassSessionModal({
  form, setForm, error, saving, onClose, onSubmit, teacherNames, maxDate,
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
            {form.entryType !== '' && (
              <div className="form-group">
                <label className="label">Entry type</label>
                <select className="input" value={form.entryType}
                  onChange={(e) => setForm((f) => ({ ...f, entryType: e.target.value as EntryType }))}>
                  {ENTRY_TYPES.map((t) => <option key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
            )}
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
              <input type="date" className="input" value={form.sessionDate} max={maxDate}
                onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Updated By</label>
              {teacherNames ? (
                <select className="input" value={form.updatedByName} onChange={(e) => setForm((f) => ({ ...f, updatedByName: e.target.value }))}>
                  {form.updatedByName && !teacherNames.includes(form.updatedByName) && (
                    <option value={form.updatedByName}>{form.updatedByName}</option>
                  )}
                  {teacherNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <input className="input" value={form.updatedByName} onChange={(e) => setForm((f) => ({ ...f, updatedByName: e.target.value }))} />
              )}
            </div>
            {form.entryType === 'SHOOT' ? (
              <>
                <div className="form-group">
                  <label className="label">Total Hours</label>
                  <input type="number" min={0} step={1} className="input" value={form.shootHours} onChange={(e) => setForm((f) => ({ ...f, shootHours: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">Minutes</label>
                  <input type="number" min={0} max={59} step={1} className="input" value={form.shootMinutes} onChange={(e) => setForm((f) => ({ ...f, shootMinutes: e.target.value }))} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label">End Time</label>
                  <input type="time" className="input" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                </div>
              </>
            )}
          </div>
          {form.entryType !== 'SHOOT' && (
            <BreakRows breaks={form.breaks} onBreaksChange={(b) => setForm((f) => ({ ...f, breaks: b }))} />
          )}
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
