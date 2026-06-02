'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'

interface FormState {
  batchId: string
  facultyId: string
  subject: string
  chapter: string
  durationHours: number
  sessionDate: string
}

interface BatchChapter {
  _id: string
  subject: string
  chapterName: string
  videoComplete: boolean
  facultyClassDone: boolean
}

const EMPTY_FORM = (defaultBatchId = ''): FormState => ({
  batchId:       defaultBatchId,
  facultyId:     '',
  subject:       '',
  chapter:       '',
  durationHours: 1,
  sessionDate:   new Date().toISOString().slice(0, 10),
})

export default function CoordinatorAccessPage() {
  const params  = useParams()
  const router  = useRouter()
  const token   = params?.token as string | undefined

  // Validate the token in the URL against the env var
  useEffect(() => {
    const expected = process.env.NEXT_PUBLIC_COORDINATOR_TOKEN
    if (!expected || token !== expected) {
      router.replace('/login')
    }
  }, [token, router])

  const { accessToken, batchId: assignedBatchId } = useAppSelector((s) => s.auth)

  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [batches,     setBatches]     = useState<Batch[]>([])
  const [form,        setForm]        = useState<FormState>(EMPTY_FORM(assignedBatchId ?? ''))
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  // Chapter loading for video-first batches
  const [chapters,     setChapters]     = useState<BatchChapter[]>([])
  const [loadingCh,    setLoadingCh]    = useState(false)

  const batchLocked = Boolean(assignedBatchId)

  // Determine if the selected batch requires video-first (RESIDENTIAL and ONLINE)
  const selectedBatch = batches.find((b) => b._id === form.batchId)
  const needsVideoFirst = selectedBatch ? isVideoFirstBatch(selectedBatch.type) : false
  const assignedBatch   = batches.find((b) => b._id === assignedBatchId)

  useEffect(() => {
    if (!accessToken) return
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
    getBatches(accessToken).then(setBatches).catch(console.error)
  }, [accessToken])

  useEffect(() => {
    if (assignedBatchId) setForm((prev) => ({ ...prev, batchId: assignedBatchId }))
  }, [assignedBatchId])

  // Load chapters when batch or subject changes (for RESIDENTIAL/ONLINE only)
  useEffect(() => {
    if (!accessToken || !form.batchId || !needsVideoFirst) {
      setChapters([])
      return
    }
    setLoadingCh(true)
    const url = `/academics/chapters?batchId=${form.batchId}${form.subject ? `&subject=${encodeURIComponent(form.subject)}` : ''}`
    apiFetch<BatchChapter[]>(url, { token: accessToken })
      .then(setChapters)
      .catch(console.error)
      .finally(() => setLoadingCh(false))
  }, [accessToken, form.batchId, form.subject, needsVideoFirst])

  // Available chapters for the selected subject
  const subjects = [...new Set(chapters.map((c) => c.subject))].sort()
  const availableChapters = chapters.filter((c) => c.subject === form.subject && c.videoComplete && !c.facultyClassDone)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      // Reset chapter when subject changes
      if (key === 'subject') updated.chapter = ''
      return updated
    })
  }

  async function handleSubmit() {
    setError('')
    if (!form.batchId)        { setError('Campus/Batch is not configured for your account'); return }
    if (!form.facultyId)      { setError('Select the faculty who took the session'); return }
    if (!form.subject.trim()) { setError('Subject is required'); return }
    if (!form.chapter.trim()) { setError('Chapter / topic is required'); return }
    if (!form.sessionDate)    { setError('Session date is required'); return }
    if (form.durationHours <= 0) { setError('Duration must be greater than 0'); return }

    // Pre-flight check for RESIDENTIAL/ONLINE: selected chapter must be videoComplete
    if (needsVideoFirst) {
      const ch = chapters.find((c) => c.subject === form.subject && c.chapterName === form.chapter)
      if (!ch) {
        setError(`"${form.chapter}" is not found in chapter records for this batch. Ask your Academics Manager to add it.`)
        return
      }
      if (!ch.videoComplete) {
        setError(`"${form.chapter}" video is not yet marked complete. Mark it in Chapter Progress before logging this session.`)
        return
      }
    }

    setSaving(true)
    try {
      await apiFetch('/academics/sessions', {
        method: 'POST',
        token: accessToken!,
        body: {
          batchId:       form.batchId,
          facultyId:     form.facultyId,
          subject:       form.subject.trim(),
          chapter:       form.chapter.trim(),
          durationHours: Number(form.durationHours),
          sessionDate:   form.sessionDate,
        },
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm(EMPTY_FORM(assignedBatchId ?? ''))
        setChapters([])
      }, 2000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to submit session'
      // Detect video-first gate
      if (msg.includes('video lessons not yet marked complete')) {
        setError(msg + ' → Go to "Chapters" in the sidebar to mark it complete first.')
      } else {
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  // Guard: token mismatch or env var not set → show clear error instead of blank page
  const expectedToken = process.env.NEXT_PUBLIC_COORDINATOR_TOKEN
  if (!expectedToken || token !== expectedToken) {
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center', color: 'var(--color-muted)' }}>
        <h2 style={{ color: 'var(--color-error, #ef4444)' }}>Invalid access link</h2>
        <p>This coordinator link is invalid or has expired. Please request a new link from your administrator.</p>
      </div>
    )
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
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <span className="alert-icon">⚠</span>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Campus / Batch */}
          <div className="form-group">
            <label className="label">Campus / Batch</label>
            {batchLocked ? (
              <div style={{
                padding: '0.6rem 0.875rem',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                color: 'var(--color-text)',
                fontWeight: 500,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{assignedBatch?.name ?? 'Your assigned campus'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 400 }}>
                  {assignedBatch?.type ?? ''}
                  {needsVideoFirst && <span style={{ marginLeft: '0.5rem', color: 'var(--color-warning)' }}>🎬 Video-first</span>}
                </span>
              </div>
            ) : (
              <select
                className="input"
                value={form.batchId}
                onChange={(e) => setField('batchId', e.target.value)}
              >
                <option value="">— select campus/batch —</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.type}{isVideoFirstBatch(b.type) ? ' 🎬' : ''})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Video-first notice */}
          {needsVideoFirst && (
            <div className="alert" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--color-warning)', padding: '0.75rem 1rem' }}>
              <span style={{ marginRight: '0.5rem' }}>🎬</span>
              <strong>Video-first batch.</strong> Only chapters with video marked complete can be logged.
              Use the <strong>Chapters</strong> page to mark videos done before logging sessions.
            </div>
          )}

          {/* Faculty */}
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

          {/* Subject */}
          <div className="form-group">
            <label className="label">Subject</label>
            {needsVideoFirst && subjects.length > 0 ? (
              <select className="input" value={form.subject} onChange={(e) => setField('subject', e.target.value)}>
                <option value="">— select subject —</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                className="input"
                value={form.subject}
                onChange={(e) => setField('subject', e.target.value)}
                placeholder="e.g. Chemistry"
              />
            )}
          </div>

          {/* Chapter / Topic */}
          <div className="form-group">
            <label className="label">Chapter / Topic</label>
            {needsVideoFirst ? (
              <>
                {loadingCh ? (
                  <div className="input" style={{ color: 'var(--color-muted)' }}>Loading chapters…</div>
                ) : availableChapters.length > 0 ? (
                  <select className="input" value={form.chapter} onChange={(e) => setField('chapter', e.target.value)}>
                    <option value="">— select chapter —</option>
                    {availableChapters.map((c) => (
                      <option key={c._id} value={c.chapterName}>{c.chapterName}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(239,68,68,.06)',
                    border: '1px solid rgba(239,68,68,.2)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    color: 'var(--color-danger)',
                  }}>
                    {form.subject
                      ? `No video-complete chapters available for "${form.subject}". Ask your Academics Manager to mark the video as complete in Chapter Progress.`
                      : 'Select a subject to see available chapters.'}
                  </div>
                )}
              </>
            ) : (
              <input
                className="input"
                value={form.chapter}
                onChange={(e) => setField('chapter', e.target.value)}
                placeholder="e.g. Organic Chemistry – Ch 4"
              />
            )}
          </div>

          {/* Hours + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Hours Taught</label>
              <input
                type="number"
                className="input"
                min={0.5}
                step={0.5}
                max={12}
                value={form.durationHours}
                onChange={(e) => setField('durationHours', +e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Session Date</label>
              <input
                type="date"
                className="input"
                value={form.sessionDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setField('sessionDate', e.target.value)}
              />
            </div>
          </div>

        </div>

        <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setForm(EMPTY_FORM(assignedBatchId ?? '')); setError(''); setChapters([]) }}
            disabled={saving}
          >
            Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving || (needsVideoFirst && !form.chapter)}
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
