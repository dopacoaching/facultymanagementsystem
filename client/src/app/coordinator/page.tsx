'use client'
import { useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import type { Batch } from '@/services/faculty.service'
import { getMyCampus } from '@/services/campus.service'
import { create as createIGSession } from '@/services/ig-session.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { NoClassCard } from '@/components/coordinator/NoClassCard'
import { todayLocal } from '@/utils/date'
import {
  EMPTY_FORM, FormState, computeDuration, monthBounds, teaBreakAsBreaks, formatHM,
  SUBJECT_OPTIONS, CLASS_MODE_OPTIONS, SubjectField, ChapterField, BreakRow,
} from '@/components/coordinator/log-session'

const batchCampusOf = (b: Batch) => (typeof b.campusId === 'object' ? b.campusId._id : b.campusId)

/**
 * Push Board — the one session-entry form for class teachers (campus logins)
 * and IG class teachers. Campus is fixed to the login; offline centres and IG
 * schools also pick one of that campus's batches.
 */
export default function PushBoardPage() {
  const { accessToken, role, campusName } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const isIG = role === 'IG_CLASS_TEACHER'

  const facultyRes = useAsyncResource<Faculty[]>(
    () => getFaculty(accessToken!),
    [accessToken],
    { enabled: !!accessToken },
  )
  const facultyList = facultyRes.data ?? []

  // Campus name, teacher names and batch campus come from the campus record that
  // HR/Admin maintain in Setup (looked up from the login).
  const myCampusRes = useAsyncResource(
    () => getMyCampus(accessToken!),
    [accessToken],
    { enabled: !!accessToken },
  )
  const myCampus = myCampusRes.data
  const batchCampusId = myCampus?.batchCampusId ?? undefined
  const campusLabel = myCampus?.name ?? (isIG ? null : campusName)
  const teacherNames = myCampus?.teachers ?? []

  const batchesRes = useAsyncResource<Batch[]>(
    () => getBatches(accessToken!),
    [accessToken],
    { enabled: !!accessToken && !!batchCampusId },
  )
  const campusBatches = useMemo(
    () => (batchesRes.data ?? []).filter((b) => batchCampusOf(b) === batchCampusId),
    [batchesRes.data, batchCampusId],
  )
  // A campus linked to batches asks for one — unless it has none set up yet.
  const needsBatch = !!batchCampusId && (batchesRes.status === 'loading' || campusBatches.length > 0)
  // Campuses with several batches may run one class for more than one of them at once.
  const multiBatch = needsBatch && campusBatches.length > 1

  const [form,   setForm]   = useState<FormState>(EMPTY_FORM())
  const [saving, setSaving] = useState(false)
  /** Field-level guidance — the user must fix something. Not retryable. */
  const [validationError, setValidationError] = useState('')
  /** The POST itself failed — retry re-runs the submit. */
  const [submitError, setSubmitError] = useState('')
  const [savedFor, setSavedFor] = useState<string | null>(null)

  // Multi-batch campuses use the checkbox list; single-batch ones the plain select.
  const chosenBatchIds = multiBatch ? form.batchIds : form.batchId ? [form.batchId] : []

  const selectedFaculty = facultyList.find((f) => f._id === form.facultyId)
  const needsSessionCategory = !isIG && Boolean(selectedFaculty?.requiresSessionCategory)
  const dateBounds = monthBounds(form.month)
  const duration = useMemo(
    () => computeDuration(form.startTime, form.endTime, teaBreakAsBreaks(form.teaBreak)),
    [form.startTime, form.endTime, form.teaBreak]
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
      if (key === 'month') {
        // Keep the date only if it still falls inside the newly picked month.
        const { min, max } = monthBounds(value as string)
        if (prev.sessionDate < min || prev.sessionDate > max) {
          const today = todayLocal()
          updated.sessionDate = today >= min && today <= max ? today : ''
        }
      }
      return updated
    })
  }

  function validate(): string | null {
    if (!campusLabel)              return 'Your account is not linked to a campus'
    if (!form.facultyId)           return 'Select the faculty who took the session'
    if (needsSessionCategory && !form.sessionCategory) return 'Select whether this was a Class or Doubt Clearance session'
    if (!form.month)               return 'Select the month & year'
    if (!form.sessionDate)         return 'Select the date'
    if (form.sessionDate < dateBounds.min || form.sessionDate > dateBounds.max) {
      return 'The date must be inside the selected month, and not in the future'
    }
    if (!form.subject.trim())      return 'Subject is required'
    if (needsBatch && !chosenBatchIds.length) return multiBatch ? 'Select at least one batch' : 'Select the batch'
    if (!form.classMode)           return 'Select the class mode'
    if (!form.chapter.trim())      return 'Chapter is required'
    if (duration.error)            return duration.error
    if (!form.updatedByName)       return 'Select who is filling in this form'
    return null
  }

  async function handleSubmit() {
    if (saving || savedFor) return
    setValidationError(''); setSubmitError('')
    const invalid = validate()
    if (invalid) { setValidationError(invalid); return }

    const common = {
      facultyId:        form.facultyId,
      classMode:        form.classMode || undefined,
      subject:          form.subject.trim(),
      chapter:          form.chapter.trim(),
      startTime:        form.startTime,
      endTime:          form.endTime,
      breakMinutes:          duration.morningBreak,
      lunchBreakMinutes:     0,
      afternoonBreakMinutes: 0,
      updatedByName:    form.updatedByName,
      durationHours:    duration.hours,
      sessionDate:      form.sessionDate,
    }

    setSaving(true)
    try {
      if (isIG) {
        await createIGSession({ ...common, batchId: chosenBatchIds[0], batchIds: chosenBatchIds }, accessToken!)
      } else {
        await apiFetch('/academics/sessions', {
          method: 'POST',
          token: accessToken!,
          body: {
            ...common,
            campusName,
            batchId: needsBatch ? chosenBatchIds[0] : undefined,
            batchIds: needsBatch ? chosenBatchIds : undefined,
            sessionCategory: needsSessionCategory ? form.sessionCategory : undefined,
          },
        })
      }
      toast.success('Session pushed', 'The session has been recorded.')
      setSavedFor(selectedFaculty?.name ?? 'the session')
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit session')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    // Keep the month — teachers usually push several sessions for the same month.
    setForm((prev) => ({ ...EMPTY_FORM(), month: prev.month, sessionDate: prev.sessionDate }))
    setValidationError('')
    setSubmitError('')
  }

  function startAnother() {
    resetForm()
    setSavedFor(null)
  }

  const activeFaculty = facultyList.filter((f) => f.isActive)
  const loadError = facultyRes.status === 'error'
    ? { message: facultyRes.error?.message ?? '', what: "Couldn't load the faculty list", retry: facultyRes.refetch }
    : batchesRes.status === 'error'
      ? { message: batchesRes.error?.message ?? '', what: "Couldn't load the batch list", retry: batchesRes.refetch }
      : null

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>Push Board</h1>
          <p className="page-subtitle">Record a class that has already been taught at {campusLabel ?? 'your campus'}.</p>
        </div>
      </div>

      <div className="card">
        {savedFor ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="alert alert-success" style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
              <span className="alert-icon" aria-hidden="true">✓</span>
              Session for {savedFor} has been recorded.
            </div>
            <div>
              <button type="button" className="btn btn-primary" onClick={startAnother}>
                Push another session
              </button>
            </div>
          </div>
        ) : (
          <>
            {loadError && (
              <div style={{ marginBottom: '1.25rem' }}>
                <ErrorAlert message={loadError.message} what={loadError.what} onRetry={loadError.retry} />
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
              <FormField label="Faculty name" htmlFor="pb-faculty" required>
                <select
                  id="pb-faculty"
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
                <FormField label="Session category" htmlFor="pb-session-category" required>
                  <select
                    id="pb-session-category"
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

              <div className="input-group">
                <FormField label="Month & year" htmlFor="pb-month" required>
                  <input
                    id="pb-month"
                    type="month"
                    className="input"
                    value={form.month}
                    max={todayLocal().slice(0, 7)}
                    onChange={(e) => setField('month', e.target.value)}
                  />
                </FormField>
                <FormField label="Date" htmlFor="pb-date" required>
                  <input
                    id="pb-date"
                    type="date"
                    className="input"
                    value={form.sessionDate}
                    min={dateBounds.min}
                    max={dateBounds.max}
                    disabled={!form.month}
                    onChange={(e) => setField('sessionDate', e.target.value)}
                  />
                </FormField>
              </div>

              <SubjectField value={form.subject} onChange={(v) => setField('subject', v)} />

              <div className="input-group">
                <FormField label="Time taken — started" htmlFor="pb-start" required hint="When the class actually began">
                  <input
                    id="pb-start"
                    type="time"
                    className="input"
                    value={form.startTime}
                    onChange={(e) => setField('startTime', e.target.value)}
                  />
                </FormField>
                <FormField label="Time taken — ended" htmlFor="pb-end" required>
                  <input
                    id="pb-end"
                    type="time"
                    className="input"
                    value={form.endTime}
                    onChange={(e) => setField('endTime', e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Campus" htmlFor="pb-campus" required>
                <select id="pb-campus" className="input" value={campusLabel ?? ''} disabled={!campusLabel} onChange={() => {}}>
                  {campusLabel
                    ? <option value={campusLabel}>{campusLabel}</option>
                    : <option value="">Not configured for your account</option>}
                </select>
              </FormField>

              {needsBatch && (multiBatch ? (
                <FormField
                  label="Batches"
                  htmlFor="pb-batches"
                  required
                  hint="Tick every batch that attended this class together"
                >
                  <div id="pb-batches" role="group" aria-label="Batches" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {batchesRes.status === 'loading' && <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>Loading batches…</span>}
                    {campusBatches.map((b) => {
                      const checked = form.batchIds.includes(b._id)
                      return (
                        <label
                          key={b._id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer',
                            padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
                            border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: checked ? 'var(--color-primary-ghost)' : 'var(--color-surface)',
                            fontSize: '0.875rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setField(
                              'batchIds',
                              checked ? form.batchIds.filter((id) => id !== b._id) : [...form.batchIds, b._id],
                            )}
                            style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                          />
                          {b.name}
                        </label>
                      )
                    })}
                  </div>
                </FormField>
              ) : (
                <FormField label="Batch" htmlFor="pb-batch" required>
                  <select
                    id="pb-batch"
                    className="input"
                    value={form.batchId}
                    disabled={batchesRes.status === 'loading'}
                    onChange={(e) => setField('batchId', e.target.value)}
                  >
                    <option value="">
                      {batchesRes.status === 'loading' ? 'Loading batches…' : '— select batch —'}
                    </option>
                    {campusBatches.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </FormField>
              ))}

              <FormField label="Class mode" htmlFor="pb-class-mode" required>
                <select
                  id="pb-class-mode"
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

              <ChapterField
                subject={form.subject}
                accessToken={accessToken}
                value={form.chapter}
                onChange={(v) => setField('chapter', v)}
              />

              <FormField
                label="Total hours & minutes"
                htmlFor="pb-total"
                hint={duration.deductedMinutes > 0 ? `${duration.deductedMinutes}m of tea break deducted` : 'Calculated automatically'}
              >
                <input
                  id="pb-total"
                  className="input"
                  readOnly
                  disabled
                  value={!duration.error ? formatHM(duration.hours * 60) : '—'}
                />
              </FormField>

              <BreakRow
                label="Break (Tea)"
                note="first 15m free"
                field={form.teaBreak}
                onChange={(patch) => setField('teaBreak', { ...form.teaBreak, ...patch })}
              />

              <FormField label="Updated by" htmlFor="pb-updated-by" required>
                <select
                  id="pb-updated-by"
                  className="input"
                  value={form.updatedByName}
                  onChange={(e) => setField('updatedByName', e.target.value)}
                >
                  <option value="">— select who is filling this in —</option>
                  {teacherNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </FormField>

              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}>
                  Clear
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? <><span className="spinner spinner-on-solid" /> Saving…</>
                    : 'Push session'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {accessToken && campusLabel && <NoClassCard accessToken={accessToken} teachers={teacherNames} />}

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        Sessions pushed here are recorded immediately. Contact the admin to make corrections.
      </p>
    </div>
  )
}
