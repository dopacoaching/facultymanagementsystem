import { useId } from 'react'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { Modal } from '@/components/ui/Modal'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
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
  const uid = useId()
  const f = (name: string) => `${uid}-${name}`
  const showChapter = form.sessionType === 'LIVE_SESSION'
  const showExamTopic = form.sessionType === 'WEEKLY_EXAM' || form.sessionType === 'MONTHLY_EXAM'

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <div>
          <h2 id={`${uid}-title`}>Assign IG class</h2>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{fmtDate(selectedDate)}</p>
        </div>
      }
      labelledById={`${uid}-title`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form={`${uid}-form`} className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner spinner-on-solid" /> Saving…</> : 'Assign class'}
          </button>
        </>
      }
    >
      {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} onDismiss={onClose} /></div>}

      <form id={`${uid}-form`} onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        <div className="form-grid">
          <FormField label="IG batch" htmlFor={f('batch')} required>
            <select className="input" value={form.batchId}
              onChange={(e) => setForm((fs) => ({ ...fs, batchId: e.target.value, subject: '', chapter: '' }))}>
              <option value="">— select —</option>
              {isIsBatches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </FormField>

          <FormField label="Session slot" htmlFor={f('slot')}>
            <select className="input" value={form.timeSlot}
              onChange={(e) => setForm((fs) => ({ ...fs, timeSlot: e.target.value as IGSessionSlot }))}>
              {SESSION_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormField>

          <FormField label="Session type" htmlFor={f('type')}>
            <select className="input" value={form.sessionType}
              onChange={(e) => setForm((fs) => ({ ...fs, sessionType: e.target.value as IGSessionType, chapter: '', examTopic: '' }))}>
              {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>

          <FormField label="Subject" htmlFor={f('subject')}>
            {availableSubjects.length > 0 ? (
              <select className="input" value={form.subject}
                onChange={(e) => setForm((fs) => ({ ...fs, subject: e.target.value, chapter: '', examTopic: '' }))}>
                <option value="">— select subject —</option>
                {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input className="input" value={form.subject} placeholder="e.g. Physics"
                onChange={(e) => setForm((fs) => ({ ...fs, subject: e.target.value, chapter: '', examTopic: '' }))} />
            )}
          </FormField>

          {showChapter && (
            <FormField label="Chapter" htmlFor={f('chapter')}>
              {availableChapters.length > 0 ? (
                <select className="input" value={form.chapter}
                  onChange={(e) => setForm((fs) => ({ ...fs, chapter: e.target.value }))}>
                  <option value="">— select chapter —</option>
                  {availableChapters.map((c) => <option key={c._id} value={c.chapterName}>{c.chapterName}</option>)}
                </select>
              ) : (
                <input className="input" value={form.chapter} placeholder="Chapter name"
                  onChange={(e) => setForm((fs) => ({ ...fs, chapter: e.target.value }))} />
              )}
            </FormField>
          )}

          {showExamTopic && (
            <FormField label="Exam topic" htmlFor={f('examTopic')} hint="Optional">
              <input className="input" value={form.examTopic}
                placeholder={`e.g. ${form.subject || 'Physics'} — Chapters 1–3`}
                onChange={(e) => setForm((fs) => ({ ...fs, examTopic: e.target.value }))} />
            </FormField>
          )}

          <FormField label="Faculty" htmlFor={f('faculty')} hint="Optional — leave unassigned if not yet decided" className="field-col-span">
            <select className="input" value={form.facultyId}
              onChange={(e) => setForm((fs) => ({ ...fs, facultyId: e.target.value }))}>
              <option value="">— unassigned —</option>
              {facultyList.map((fac) => <option key={fac._id} value={fac._id}>{fac.name} ({fac.subject})</option>)}
            </select>
          </FormField>

          <FormField label="Start time" htmlFor={f('start')}>
            <input type="time" className="input" value={form.startTime}
              onChange={(e) => setForm((fs) => ({ ...fs, startTime: e.target.value }))} />
          </FormField>

          <div className="form-group">
            <label className="label" htmlFor={f('durH')}>Planned duration</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input id={f('durH')} type="number" className="input" min={0} max={12} step={1}
                style={{ width: '5rem' }} placeholder="hrs" aria-label="Hours"
                value={form.durationHours}
                onChange={(e) => setForm((fs) => ({ ...fs, durationHours: e.target.value }))} />
              <select className="input" style={{ width: '5.5rem' }} aria-label="Minutes"
                value={form.durationMinutes}
                onChange={(e) => setForm((fs) => ({ ...fs, durationMinutes: +e.target.value }))}>
                {[0,5,10,15,20,25,30,35,40,45,50,55].map((m) => <option key={m} value={m}>{m}m</option>)}
              </select>
            </div>
          </div>

          <FormField label="Notes" htmlFor={f('notes')} hint="Optional" className="field-col-span">
            <input className="input" value={form.notes} placeholder="Any notes…"
              onChange={(e) => setForm((fs) => ({ ...fs, notes: e.target.value }))} />
          </FormField>

          <div className="form-group field-col-span" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id={f('unplanned')} checked={form.isUnplanned}
              onChange={(e) => setForm((fs) => ({ ...fs, isUnplanned: e.target.checked }))} />
            <label htmlFor={f('unplanned')} className="label" style={{ margin: 0 }}>
              Mark as unplanned (logged after-the-fact)
            </label>
          </div>
        </div>
      </form>
    </Modal>
  )
}
