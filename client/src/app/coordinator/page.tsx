'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  EMPTY_FORM, FormState, computeDuration,
  BatchSelector, TimeRangeFields,
} from '@/components/coordinator/log-session'

export default function LogSessionPage() {
  const { accessToken, batchId: assignedBatchId } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [batches,     setBatches]     = useState<Batch[]>([])
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM(assignedBatchId ?? ''))
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  const batchLocked   = Boolean(assignedBatchId)
  const assignedBatch = batches.find((b) => b._id === assignedBatchId)
  const duration = useMemo(
    () => computeDuration(form.startTime, form.endTime, form.breakMinutes),
    [form.startTime, form.endTime, form.breakMinutes]
  )

  useEffect(() => {
    if (!accessToken) return
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
    getBatches(accessToken).then(setBatches).catch(console.error)
  }, [accessToken])

  useEffect(() => {
    if (assignedBatchId) setForm((prev) => ({ ...prev, batchId: assignedBatchId }))
  }, [assignedBatchId])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      // Auto-fill subject from the selected faculty's profile
      if (key === 'facultyId') {
        const fac = facultyList.find((f) => f._id === (value as string))
        if (fac?.subject) updated.subject = fac.subject.toUpperCase()
      }
      return updated
    })
  }

  async function handleSubmit() {
    setError('')
    if (!form.batchId)           { setError('Campus/Batch is not configured for your account'); return }
    if (!form.facultyId)         { setError('Select the faculty who took the session'); return }
    if (!form.subject.trim())    { setError('Subject is required'); return }
    if (!form.sessionDate)       { setError('Session date is required'); return }
    if (duration.error)          { setError(duration.error); return }

    setSaving(true)
    try {
      await apiFetch('/academics/sessions', {
        method: 'POST',
        token: accessToken!,
        body: {
          batchId:       form.batchId,
          facultyId:     form.facultyId,
          subject:       form.subject.trim(),
          chapter:       form.chapter.trim() || undefined,
          startTime:     form.startTime,
          endTime:       form.endTime,
          breakMinutes:  duration.breakMinutes,
          durationHours: duration.hours,
          sessionDate:   form.sessionDate,
        },
      })
      toast.success('Session logged', 'The session has been recorded. The form has been reset.')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm(EMPTY_FORM(assignedBatchId ?? ''))
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

          <BatchSelector
            batchLocked={batchLocked}
            assignedBatch={assignedBatch}
            batches={batches}
            value={form.batchId}
            onChange={(v) => setField('batchId', v)}
          />

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
            <label className="label">Subject</label>
            <select className="input" value={form.subject} onChange={(e) => setField('subject', e.target.value as FormState['subject'])}>
              <option value="">— select subject —</option>
              <option value="PHYSICS">Physics</option>
              <option value="CHEMISTRY">Chemistry</option>
              <option value="BIOLOGY">Biology</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Topic / Notes (optional)</label>
            <input
              type="text"
              className="input"
              value={form.chapter}
              onChange={(e) => setField('chapter', e.target.value)}
              placeholder="e.g. what was covered in this class"
            />
          </div>

          <TimeRangeFields
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

        </div>

        <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setForm(EMPTY_FORM(assignedBatchId ?? '')); setError('') }}
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
