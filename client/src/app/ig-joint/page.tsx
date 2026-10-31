'use client'
import { useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { todayLocal } from '@/utils/date'
import {
  EMPTY_FORM, FormState, computeDuration, monthBounds, teaBreakAsBreaks, formatHM,
  CLASS_MODE_OPTIONS, SubjectField, ChaptersField, BreakRow,
} from '@/components/coordinator/log-session'

interface JointOptions {
  enteredBy: string
  schools: { campusName: string; batches: { _id: string; name: string }[] }[]
  faculty: { _id: string; name: string; subject: string }[]
}

/**
 * Joint class entry — one class taught to batches of two or more IG schools at once
 * (e.g. one faculty teaching IG 1 and IG 2 together). Recorded as a single entry, so
 * the faculty's hours count once, and it shows under every school it covered.
 */
export default function IGJointEntryPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const options = useAsyncResource<JointOptions>(
    () => apiFetch<JointOptions>('/ig/joint-sessions', { token: accessToken! }),
    [accessToken],
    { enabled: !!accessToken },
  )
  const schools = options.data?.schools ?? []
  const faculty = options.data?.faculty ?? []

  const [form, setForm] = useState<FormState>(EMPTY_FORM())
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [saved, setSaved] = useState(false)

  const dateBounds = monthBounds(form.month)
  const duration = useMemo(
    () => computeDuration(form.startTime, form.endTime, teaBreakAsBreaks(form.teaBreak), { fullBreak: false }),
    [form.startTime, form.endTime, form.teaBreak],
  )

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      if (key === 'subject' && prev.subject !== value) updated.chapters = []
      if (key === 'month') {
        const { min, max } = monthBounds(value as string)
        if (prev.sessionDate < min || prev.sessionDate > max) {
          const today = todayLocal()
          updated.sessionDate = today >= min && today <= max ? today : ''
        }
      }
      return updated
    })
  }

  const schoolsPicked = schools.filter((s) => s.batches.some((b) => form.batchIds.includes(b._id))).length

  function validate(): string | null {
    if (!form.facultyId) return 'Select the faculty who took the class'
    if (!form.month) return 'Select the month & year'
    if (!form.sessionDate) return 'Select the date'
    if (form.sessionDate < dateBounds.min || form.sessionDate > dateBounds.max) return 'The date must be inside the selected month, and not in the future'
    if (!form.subject.trim()) return 'Subject is required'
    if (schoolsPicked < 2) return 'Tick batches from at least two IG schools'
    if (!form.classMode) return 'Select the class mode'
    if (form.chapters.length === 0) return 'Add at least one chapter'
    if (duration.error) return duration.error
    return null
  }

  async function submit() {
    if (saving) return
    setValidationError(''); setSubmitError('')
    const invalid = validate()
    if (invalid) { setValidationError(invalid); return }
    setSaving(true)
    try {
      await apiFetch('/ig/joint-sessions', {
        method: 'POST',
        token: accessToken!,
        body: {
          facultyId: form.facultyId,
          batchIds: form.batchIds,
          subject: form.subject.trim(),
          chapters: form.chapters,
          classMode: form.classMode,
          startTime: form.startTime,
          endTime: form.endTime,
          breakMinutes: duration.morningBreak,
          comment: form.comment.trim() || undefined,
          durationHours: duration.hours,
          sessionDate: form.sessionDate,
        },
      })
      toast.success('Joint class recorded', 'One entry covers all the selected schools.')
      setSaved(true)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit the class')
    } finally {
      setSaving(false)
    }
  }

  function startAnother() {
    setForm((prev) => ({ ...EMPTY_FORM(), month: prev.month, sessionDate: prev.sessionDate }))
    setValidationError(''); setSubmitError(''); setSaved(false)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>Joint Class Entry</h1>
          <p className="page-subtitle">One class taught to two or more IG schools at the same time. Hours count once.</p>
        </div>
      </div>

      <div className="card">
        {saved ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="alert alert-success" style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
              <span className="alert-icon" aria-hidden="true">✓</span>
              The joint class has been recorded for {schoolsPicked} schools.
            </div>
            <div>
              <button type="button" className="btn btn-primary" onClick={startAnother}>Enter another joint class</button>
            </div>
          </div>
        ) : (
          <>
            {options.status === 'error' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <ErrorAlert message={options.error?.message ?? ''} what="Couldn't load schools and faculty" onRetry={options.refetch} />
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
                <ErrorAlert message={submitError} what="Class could not be submitted" onRetry={submit} onDismiss={() => setSubmitError('')} />
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); submit() }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <FormField label="Faculty name" htmlFor="jc-faculty" required>
                <select id="jc-faculty" className="input" value={form.facultyId} disabled={options.status === 'loading'}
                  onChange={(e) => {
                    const f = faculty.find((x) => x._id === e.target.value)
                    setField('facultyId', e.target.value)
                    if (f?.subject) setField('subject', f.subject.toUpperCase())
                  }}>
                  <option value="">{options.status === 'loading' ? 'Loading faculty…' : '— select faculty —'}</option>
                  {faculty.map((f) => <option key={f._id} value={f._id}>{f.name} — {f.subject}</option>)}
                </select>
              </FormField>

              <div className="input-group">
                <FormField label="Month & year" htmlFor="jc-month" required>
                  <input id="jc-month" type="month" className="input" value={form.month} max={todayLocal().slice(0, 7)}
                    onChange={(e) => setField('month', e.target.value)} />
                </FormField>
                <FormField label="Date" htmlFor="jc-date" required>
                  <input id="jc-date" type="date" className="input" value={form.sessionDate} min={dateBounds.min} max={dateBounds.max}
                    disabled={!form.month} onChange={(e) => setField('sessionDate', e.target.value)} />
                </FormField>
              </div>

              <SubjectField value={form.subject} onChange={(v) => setField('subject', v)} />

              <div className="input-group">
                <FormField label="Time taken — started" htmlFor="jc-start" required>
                  <input id="jc-start" type="time" className="input" value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} />
                </FormField>
                <FormField label="Time taken — ended" htmlFor="jc-end" required>
                  <input id="jc-end" type="time" className="input" value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} />
                </FormField>
              </div>

              <FormField label="Schools & batches" htmlFor="jc-batches" required hint="Tick every batch that attended — from at least two schools">
                <div id="jc-batches" role="group" aria-label="Schools and batches" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {options.status === 'loading' && <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>Loading schools…</span>}
                  {schools.map((s) => (
                    <div key={s.campusName}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.375rem' }}>{s.campusName}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {s.batches.map((b) => {
                          const checked = form.batchIds.includes(b._id)
                          return (
                            <label key={b._id} style={{
                              display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer',
                              padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
                              border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                              background: checked ? 'var(--color-primary-ghost)' : 'var(--color-surface)', fontSize: '0.875rem',
                            }}>
                              <input type="checkbox" checked={checked}
                                onChange={() => setField('batchIds', checked ? form.batchIds.filter((id) => id !== b._id) : [...form.batchIds, b._id])}
                                style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                              {b.name}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </FormField>

              <FormField label="Class mode" htmlFor="jc-mode" required>
                <select id="jc-mode" className="input" value={form.classMode} onChange={(e) => setField('classMode', e.target.value as FormState['classMode'])}>
                  <option value="">— select —</option>
                  {CLASS_MODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </FormField>

              <ChaptersField subject={form.subject} accessToken={accessToken} value={form.chapters} onChange={(v) => setField('chapters', v)} />

              <FormField label="Total hours & minutes" htmlFor="jc-total"
                hint={duration.deductedMinutes > 0 ? `${duration.deductedMinutes}m of break deducted` : 'Calculated automatically'}>
                <input id="jc-total" className="input" readOnly disabled value={!duration.error ? formatHM(duration.hours * 60) : '—'} />
              </FormField>

              <BreakRow label="Break (Tea)" note="first 15m free" field={form.teaBreak}
                onChange={(patch) => setField('teaBreak', { ...form.teaBreak, ...patch })} />

              <FormField label="Entered by" htmlFor="jc-by">
                <input id="jc-by" className="input" readOnly disabled value={options.data?.enteredBy ?? ''} />
              </FormField>

              <FormField label="Comment" htmlFor="jc-comment" hint="Optional — anything HR should know about this class">
                <textarea id="jc-comment" className="input" rows={3} maxLength={500} value={form.comment}
                  onChange={(e) => setField('comment', e.target.value)} style={{ resize: 'vertical' }} />
              </FormField>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit joint class'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
