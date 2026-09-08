'use client'
import { useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { findCampusByName } from '@/lib/constants/campuses'
import type { Faculty } from '@/types'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import {
  EMPTY_FORM, FormState, computeDuration, SUBJECT_OPTIONS, CLASS_MODE_OPTIONS,
  TimeRangeFields, SubjectField, ChapterField,
} from '@/components/coordinator/log-session'

export default function LogSessionPage() {
  const { accessToken, campusName } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const facultyRes = useAsyncResource<Faculty[]>(
    () => getFaculty(accessToken!),
    [accessToken],
    { enabled: !!accessToken },
  )
  const facultyList = facultyRes.data ?? []

  const [form,   setForm]   = useState<FormState>(EMPTY_FORM())
  const [saving, setSaving] = useState(false)
  /** Field-level guidance — the user must fix something. Not retryable. */
  const [validationError, setValidationError] = useState('')
  /** The POST itself failed — retry re-runs the submit. */
  const [submitError, setSubmitError] = useState('')
  const [savedFor, setSavedFor] = useState<string | null>(null)

  const campus = findCampusByName(campusName)
  const selectedFaculty = facultyList.find((f) => f._id === form.facultyId)
  const needsSessionCategory = Boolean(selectedFaculty?.requiresSessionCategory)
  const duration = useMemo(
    () => computeDuration(form.startTime, form.endTime, form.breaks),
    [form.startTime, form.endTime, form.breaks]
  )

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      if (key === 'facultyId') {
        const fac = facultyList.find((f) => f._id === (value as string))
        const match = SUBJECT_OPTIONS.find((s) => s.value === fac?.subject?.toUpperCase())
        if (match) {
          // Auto-fill subject from the faculty's profile — and because chapter
          // options are subject-specific, drop a now-mismatched chapter too.
          if (match.value !== prev.subject) updated.chapter = ''
          updated.subject = match.value
        }
      }
      if (key === 'subject' && prev.subject !== value) updated.chapter = ''
      return updated
    })
  }

  function validate(): string | null {
    if (!campusName)          return 'Your account is not linked to a campus'
    if (!form.facultyId)      return 'Select the faculty who took the session'
    if (!form.subject.trim()) return 'Subject is required'
    if (!form.chapter.trim()) return 'Chapter is required'
    if (!form.classMode)      return 'Select the class mode'
    if (needsSessionCategory && !form.sessionCategory) return 'Select whether this was a Class or Doubt Clearance session'
    if (!form.updatedByName)  return 'Select who is filling in this form'
    if (!form.sessionDate)    return 'Session date is required'
    if (duration.error)       return duration.error
    return null
  }

  async function handleSubmit() {
    if (saving || savedFor) return
    setValidationError(''); setSubmitError('')
    const invalid = validate()
    if (invalid) { setValidationError(invalid); return }

    setSaving(true)
    try {
      await apiFetch('/academics/sessions', {
        method: 'POST',
        token: accessToken!,
        body: {
          campusName,
          classMode:     form.classMode,
          facultyId:     form.facultyId,
          subject:       form.subject.trim(),
          chapter:       form.chapter.trim(),
          scheduledTime: form.scheduledTime || undefined,
          startTime:     form.startTime,
          endTime:       form.endTime,
          breakMinutes:          duration.morningBreak,
          lunchBreakMinutes:     duration.lunchBreak,
          afternoonBreakMinutes: duration.afternoonBreak,
          updatedByName: form.updatedByName,
          durationHours: duration.hours,
          sessionDate:   form.sessionDate,
          sessionCategory: needsSessionCategory ? form.sessionCategory : undefined,
        },
      })
      toast.success('Session logged', 'The session has been recorded.')
      setSavedFor(selectedFaculty?.name ?? 'the session')
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit session')
    } finally {
      setSaving(false)
    }
  }

  function startAnother() {
    setForm(EMPTY_FORM())
    setSavedFor(null)
    setValidationError('')
    setSubmitError('')
  }

  const activeFaculty = facultyList.filter((f) => f.isActive)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>Log a session</h1>
          <p className="page-subtitle">Record a class that has already been taught at {campusName ?? 'your campus'}.</p>
        </div>
      </div>

      <div className="card">
        {savedFor ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="alert alert-success" style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
              <span className="alert-icon" aria-hidden="true">✓</span>
              Session for {savedFor} has been logged.
            </div>
            <div>
              <button type="button" className="btn btn-primary" onClick={startAnother}>
                Log another session
              </button>
            </div>
          </div>
        ) : (
          <>
            {facultyRes.status === 'error' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <ErrorAlert
                  message={facultyRes.error?.message ?? ''}
                  what="Couldn't load the faculty list"
                  onRetry={facultyRes.refetch}
                />
              </div>
            )}

            {validationError && (
              <div className="alert alert-warning" role="alert" style={{ marginBottom: '1.25rem' }}>
                <span className="alert-icon" aria-hidden="true">!</span>
                {validationError}
              </div>
            )}

            {submitError && (
              <div style={{ marginBottom: '1.25rem' }}>
                <ErrorAlert
                  message={submitError}
                  what="Session could not be submitted"
                  onRetry={handleSubmit}
                  onDismiss={() => setSubmitError('')}
                />
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <FormField label="Campus" htmlFor="log-campus">
                <input
                  id="log-campus"
                  className="input"
                  value={campusName ?? 'Not configured for your account'}
                  disabled
                  readOnly
                />
              </FormField>

              <FormField label="Faculty" htmlFor="log-faculty" required>
                <select
                  id="log-faculty"
                  className="input"
                  value={form.facultyId}
                  disabled={facultyRes.status === 'loading'}
                  onChange={(e) => setField('facultyId', e.target.value)}
                >
                  <option value="">
                    {facultyRes.status === 'loading' ? 'Loading faculty…' : '— select faculty —'}
                  </option>
                  {activeFaculty.map((f) => (
                    <option key={f._id} value={f._id}>{f.name} — {f.subject}</option>
                  ))}
                </select>
              </FormField>

              {needsSessionCategory && (
                <FormField label="Session category" htmlFor="log-session-category" required>
                  <select
                    id="log-session-category"
                    className="input"
                    value={form.sessionCategory}
                    onChange={(e) => setField('sessionCategory', e.target.value as FormState['sessionCategory'])}
                  >
                    <option value="">— select —</option>
                    <option value="CLASS">Class</option>
                    <option value="DOUBT_CLEARANCE">Doubt Clearance</option>
                  </select>
                </FormField>
              )}

              <SubjectField value={form.subject} onChange={(v) => setField('subject', v)} />

              <ChapterField
                subject={form.subject}
                accessToken={accessToken}
                value={form.chapter}
                onChange={(v) => setField('chapter', v)}
              />

              <FormField label="Class mode" htmlFor="log-class-mode" required>
                <select
                  id="log-class-mode"
                  className="input"
                  value={form.classMode}
                  onChange={(e) => setField('classMode', e.target.value as FormState['classMode'])}
                >
                  <option value="">— select —</option>
                  {CLASS_MODE_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </FormField>

              <TimeRangeFields
                scheduledTime={form.scheduledTime}
                onScheduledTimeChange={(v) => setField('scheduledTime', v)}
                startTime={form.startTime}
                onStartTimeChange={(v) => setField('startTime', v)}
                endTime={form.endTime}
                onEndTimeChange={(v) => setField('endTime', v)}
                breaks={form.breaks}
                onBreaksChange={(b) => setField('breaks', b)}
                sessionDate={form.sessionDate}
                onSessionDateChange={(v) => setField('sessionDate', v)}
                duration={duration}
              />

              <FormField label="Updated by" htmlFor="log-updated-by" required>
                <select
                  id="log-updated-by"
                  className="input"
                  value={form.updatedByName}
                  onChange={(e) => setField('updatedByName', e.target.value)}
                >
                  <option value="">— select who is filling this in —</option>
                  {(campus?.teachers ?? []).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </FormField>

              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setForm(EMPTY_FORM()); setValidationError(''); setSubmitError('') }}
                  disabled={saving}
                >
                  Clear
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? <><span className="spinner spinner-on-solid" /> Saving…</>
                    : 'Submit session'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        Sessions submitted here are recorded immediately. Contact your Academics Manager to make corrections.
      </p>
    </div>
  )
}
