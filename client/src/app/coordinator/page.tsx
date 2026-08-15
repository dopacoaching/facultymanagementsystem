'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { findCampusByName } from '@/lib/constants/campuses'
import type { Faculty } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  EMPTY_FORM, FormState, computeDuration, SUBJECT_OPTIONS,
  TimeRangeFields, SubjectField, ChapterField,
} from '@/components/coordinator/log-session'

export default function LogSessionPage() {
  const { accessToken, campusName } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM())
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  const campus = findCampusByName(campusName)
  const duration = useMemo(
    () => computeDuration(form.startTime, form.endTime, form.breakMinutes),
    [form.startTime, form.endTime, form.breakMinutes]
  )

  useEffect(() => {
    if (!accessToken) return
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
  }, [accessToken])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      // Auto-fill subject from the selected faculty's profile
      if (key === 'facultyId') {
        const fac = facultyList.find((f) => f._id === (value as string))
        const match = SUBJECT_OPTIONS.find((s) => s.value === fac?.subject?.toUpperCase())
        if (match) updated.subject = match.value
      }
      // Chapter options are subject-specific — clear the old selection when subject changes
      if (key === 'subject' && prev.subject !== value) updated.chapter = ''
      return updated
    })
  }

  async function handleSubmit() {
    setError('')
    if (!campusName)             { setError('Your account is not linked to a campus'); return }
    if (!form.facultyId)         { setError('Select the faculty who took the session'); return }
    if (!form.subject.trim())    { setError('Subject is required'); return }
    if (!form.chapter.trim())    { setError('Chapter is required'); return }
    if (!form.classMode)         { setError('Select whether the class was online or offline'); return }
    if (!form.updatedByName)     { setError('Select who is filling in this form'); return }
    if (!form.sessionDate)       { setError('Session date is required'); return }
    if (duration.error)          { setError(duration.error); return }

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
          breakMinutes:  duration.breakMinutes,
          updatedByName: form.updatedByName,
          durationHours: duration.hours,
          sessionDate:   form.sessionDate,
        },
      })
      toast.success('Session logged', 'The session has been recorded. The form has been reset.')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm(EMPTY_FORM())
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
              {campusName ?? 'Not configured for your account'}
            </div>
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

          <SubjectField
            value={form.subject}
            onChange={(v) => setField('subject', v)}
          />

          <ChapterField
            subject={form.subject}
            accessToken={accessToken}
            value={form.chapter}
            onChange={(v) => setField('chapter', v)}
          />

          <div className="form-group">
            <label className="label">Class Mode</label>
            <select
              className="input"
              value={form.classMode}
              onChange={(e) => setField('classMode', e.target.value as FormState['classMode'])}
            >
              <option value="">— select —</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          <TimeRangeFields
            scheduledTime={form.scheduledTime}
            onScheduledTimeChange={(v) => setField('scheduledTime', v)}
            startTime={form.startTime}
            onStartTimeChange={(v) => setField('startTime', v)}
            endTime={form.endTime}
            onEndTimeChange={(v) => setField('endTime', v)}
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
              {(campus?.teachers ?? []).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

        </div>

        <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setForm(EMPTY_FORM()); setError('') }}
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
        Sessions submitted here are recorded immediately. Contact your Academics Manager to make corrections.
      </p>
    </div>
  )
}
