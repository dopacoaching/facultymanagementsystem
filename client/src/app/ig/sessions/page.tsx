'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { getCampuses } from '@/services/campus.service'
import { create as createIGSession } from '@/services/ig-session.service'
import { apiFetch } from '@/services/api'
import { IG_TEACHERS } from '@/lib/constants/igTeachers'
import { computeDuration, TimeRangeFields } from '@/components/coordinator/log-session'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import type { Campus } from '@/services/campus.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { ISBatchChapter } from '@/components/integrated-school/sessions'

type SessionSlot = 'SESSION_1' | 'SESSION_2' | 'SESSION_3'

interface FormState {
  batchId: string
  facultyId: string
  timeSlot: SessionSlot | ''
  subject: string
  chapter: string
  scheduledTime: string
  startTime: string
  endTime: string
  noBreak: boolean
  breakMinutes: string
  updatedByName: string
  sessionDate: string
}

const EMPTY_FORM = (): FormState => ({
  batchId:       '',
  facultyId:     '',
  timeSlot:      '',
  subject:       '',
  chapter:       '',
  scheduledTime: '',
  startTime:     '',
  endTime:       '',
  noBreak:       false,
  breakMinutes:  '',
  updatedByName: '',
  sessionDate:   todayLocal(),
})

export default function IGLogSessionPage() {
  const { accessToken, campusId: coordinatorCampusId } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [campuses, setCampuses]       = useState<Campus[]>([])
  const [igChapters, setIgChapters]   = useState<ISBatchChapter[]>([])
  const [loadingIgCh, setLoadingIgCh] = useState(false)

  const [form, setForm]     = useState<FormState>(EMPTY_FORM())
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const campus = campuses.find((c) => c._id === coordinatorCampusId)
  const teacherNames = coordinatorCampusId ? (IG_TEACHERS[coordinatorCampusId] ?? []) : []
  const duration = useMemo(
    () => computeDuration(form.startTime, form.endTime, form.noBreak, form.breakMinutes),
    [form.startTime, form.endTime, form.noBreak, form.breakMinutes]
  )

  useEffect(() => {
    if (!accessToken) return
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
    getCampuses(accessToken).then(setCampuses).catch(console.error)
    getBatches(accessToken).then((list) => {
      const isBatches = list.filter((b) => b.type === 'IG')
      const visible = coordinatorCampusId
        ? isBatches.filter((b) => (typeof b.campusId === 'object' ? b.campusId._id : b.campusId) === coordinatorCampusId)
        : isBatches
      setBatches(visible)
      if (visible.length) setForm((f) => ({ ...f, batchId: visible[0]._id }))
    }).catch(console.error)
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load ISBatchChapter list when batch changes (drives subject + chapter dropdowns)
  useEffect(() => {
    if (!accessToken || !form.batchId) { setIgChapters([]); return }
    setLoadingIgCh(true)
    apiFetch<ISBatchChapter[]>(`/ig/chapters?batchId=${form.batchId}`, { token: accessToken })
      .then(setIgChapters).catch(console.error).finally(() => setLoadingIgCh(false))
  }, [accessToken, form.batchId])

  const igSubjects = useMemo(
    () => [...new Set(igChapters.map((c) => c.subject))].sort(),
    [igChapters]
  )
  const igFilteredChapters = useMemo(
    () => igChapters.filter((c) => c.subject === form.subject).sort((a, b) => a.chapterOrder - b.chapterOrder),
    [igChapters, form.subject]
  )

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      if (key === 'batchId') { updated.subject = ''; updated.chapter = '' }
      if (key === 'subject' && prev.subject !== value) updated.chapter = ''
      return updated
    })
  }

  async function handleSubmit() {
    setError('')
    if (!coordinatorCampusId) { setError('Your account is not linked to a campus'); return }
    if (!form.batchId)          { setError('Select the batch'); return }
    if (!form.facultyId)        { setError('Select the faculty who took the session'); return }
    if (!form.timeSlot)         { setError('Select the session slot'); return }
    if (!form.subject.trim())   { setError('Subject is required'); return }
    if (!form.chapter.trim())   { setError('Chapter is required'); return }
    if (!form.updatedByName)    { setError('Select who is filling in this form'); return }
    if (!form.sessionDate)      { setError('Session date is required'); return }
    if (duration.error)         { setError(duration.error); return }

    setSaving(true)
    try {
      await createIGSession({
        facultyId:     form.facultyId,
        batchId:       form.batchId,
        timeSlot:      form.timeSlot,
        subject:       form.subject.trim(),
        chapter:       form.chapter.trim(),
        scheduledTime: form.scheduledTime || undefined,
        startTime:     form.startTime,
        endTime:       form.endTime,
        breakMinutes:  duration.breakMinutes,
        updatedByName: form.updatedByName,
        durationHours: duration.hours,
        sessionDate:   form.sessionDate,
      }, accessToken!)
      toast.success('Session logged', 'The session has been recorded. The form has been reset.')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm((f) => ({ ...EMPTY_FORM(), batchId: f.batchId }))
      }, 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit session')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>

      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.375rem', margin: '0 0 0.375rem', color: 'var(--color-text)' }}>
          Log a Session
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Fill in the details of the class that was completed.
        </p>
      </div>

      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        padding: '2rem',
      }}>

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            <span className="alert-icon">✅</span>
            Session logged successfully! The form has been reset.
          </div>
        )}

        {error && (
          <div style={{ marginBottom: '1.5rem' }}>
            <ErrorAlert message={error} what="Session could not be submitted" onRetry={() => setError('')} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div className="form-group">
            <label className="label">Campus</label>
            <div style={{
              padding: '0.6rem 0.875rem',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9375rem',
              color: 'var(--color-text)',
              fontWeight: 500,
            }}>
              {campus?.name ?? 'Not configured for your account'}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Batch</label>
            <select
              className="input"
              value={form.batchId}
              onChange={(e) => setField('batchId', e.target.value)}
            >
              <option value="">— select batch —</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Faculty</label>
            <select
              className="input"
              value={form.facultyId}
              onChange={(e) => setField('facultyId', e.target.value)}
            >
              <option value="">— select faculty —</option>
              {facultyList.filter((f) => f.isActive).map((f) => (
                <option key={f._id} value={f._id}>{f.name} — {f.subject}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Session Slot</label>
            <select
              className="input"
              value={form.timeSlot}
              onChange={(e) => setField('timeSlot', e.target.value as SessionSlot)}
            >
              <option value="">— select session —</option>
              <option value="SESSION_1">Session 1</option>
              <option value="SESSION_2">Session 2</option>
              <option value="SESSION_3">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Subject</label>
            {igSubjects.length > 0 ? (
              <select className="input" value={form.subject} onChange={(e) => setField('subject', e.target.value)}>
                <option value="">— select subject —</option>
                {igSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                className="input"
                value={form.subject}
                placeholder={loadingIgCh ? 'Loading…' : 'Type subject'}
                onChange={(e) => setField('subject', e.target.value)}
              />
            )}
          </div>

          <div className="form-group">
            <label className="label">Chapter</label>
            {igFilteredChapters.length > 0 ? (
              <select className="input" value={form.chapter} onChange={(e) => setField('chapter', e.target.value)}>
                <option value="">— select chapter —</option>
                {igFilteredChapters.map((c) => (
                  <option key={c._id} value={c.chapterName}>
                    {c.chapterName}{c.status === 'COMPLETED' ? ' ✓' : c.status === 'CANCELLED' ? ' ✗' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                value={form.chapter}
                placeholder={loadingIgCh ? 'Loading…' : 'Type chapter'}
                onChange={(e) => setField('chapter', e.target.value)}
              />
            )}
          </div>

          <TimeRangeFields
            scheduledTime={form.scheduledTime}
            onScheduledTimeChange={(v) => setField('scheduledTime', v)}
            startTime={form.startTime}
            onStartTimeChange={(v) => setField('startTime', v)}
            endTime={form.endTime}
            onEndTimeChange={(v) => setField('endTime', v)}
            noBreak={form.noBreak}
            onNoBreakChange={(v) => setField('noBreak', v)}
            breakMinutes={form.breakMinutes}
            onBreakMinutesChange={(v) => setField('breakMinutes', v)}
            sessionDate={form.sessionDate}
            onSessionDateChange={(v) => setField('sessionDate', v)}
            duration={duration}
          />

          <div className="form-group">
            <label className="label">Updated By</label>
            <select
              className="input"
              value={form.updatedByName}
              onChange={(e) => setField('updatedByName', e.target.value)}
            >
              <option value="">— select who is filling this in —</option>
              {teacherNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

        </div>

        <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setForm((f) => ({ ...EMPTY_FORM(), batchId: f.batchId })); setError('') }}
            disabled={saving}
          >
            Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</>
              : '✓ Submit Session'}
          </button>
        </div>

      </div>

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
        Sessions submitted here are recorded immediately. Contact HR to make corrections.
      </p>
    </div>
  )
}
