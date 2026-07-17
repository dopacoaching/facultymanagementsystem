'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  BatchChapter, EMPTY_FORM, FormState, NEET_SUBJECTS, SyllabusChapter,
  BatchSelector, ChapterSelector, DurationDateFields,
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

  const [chapters,         setChapters]         = useState<BatchChapter[]>([])
  const [loadingCh,        setLoadingCh]        = useState(false)
  const [syllabusChapters, setSyllabusChapters] = useState<SyllabusChapter[]>([])
  const [loadingSyllabus,  setLoadingSyllabus]  = useState(false)

  const batchLocked     = Boolean(assignedBatchId)
  const selectedBatch   = batches.find((b) => b._id === form.batchId)
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

  // Load per-batch chapter status for all batch types
  useEffect(() => {
    if (!accessToken || !form.batchId || !form.subject) { setChapters([]); return }
    let cancelled = false
    setLoadingCh(true)
    const url = `/academics/chapters?batchId=${form.batchId}&subject=${encodeURIComponent(form.subject.toUpperCase())}`
    apiFetch<BatchChapter[]>(url, { token: accessToken })
      .then((data) => { if (!cancelled) setChapters(data) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingCh(false) })
    return () => { cancelled = true }
  }, [accessToken, form.batchId, form.subject])

  // Load syllabus chapters (monthly plan) when subject is a NEET subject
  useEffect(() => {
    const subjUp = form.subject.toUpperCase()
    if (!accessToken || !NEET_SUBJECTS.includes(subjUp)) { setSyllabusChapters([]); return }
    setLoadingSyllabus(true)
    apiFetch<SyllabusChapter[]>(`/academics/syllabus/chapters?subject=${subjUp}`, { token: accessToken })
      .then(setSyllabusChapters).catch(console.error).finally(() => setLoadingSyllabus(false))
  }, [accessToken, form.subject])

  // Syllabus chapters grouped by month
  const syllabusChaptersByMonth = useMemo(() => {
    const map: Record<number, SyllabusChapter[]> = {}
    for (const ch of syllabusChapters) {
      if (!map[ch.scheduledMonth]) map[ch.scheduledMonth] = []
      map[ch.scheduledMonth].push(ch)
    }
    return map
  }, [syllabusChapters])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      if (key === 'subject') { updated.chapter = ''; updated.syllabusChapterId = undefined }
      // Auto-fill subject from the selected faculty's profile
      if (key === 'facultyId') {
        const fac = facultyList.find((f) => f._id === (value as string))
        if (fac?.subject) {
          updated.subject = fac.subject.toUpperCase()
          updated.chapter = ''
          updated.syllabusChapterId = undefined
        }
      }
      return updated
    })
  }

  function selectChapter(chapterName: string) {
    const ch = syllabusChapters.find((c) => c.chapterName === chapterName)
    setForm((prev) => ({
      ...prev,
      chapter:           chapterName,
      syllabusChapterId: ch?._id ?? undefined,
    }))
  }

  async function handleSubmit() {
    setError('')
    if (!form.batchId)           { setError('Campus/Batch is not configured for your account'); return }
    if (!form.facultyId)         { setError('Select the faculty who took the session'); return }
    if (!form.subject.trim())    { setError('Subject is required'); return }
    if (!form.chapter.trim())    { setError('Chapter / topic is required'); return }
    if (!form.sessionDate)       { setError('Session date is required'); return }
    if (form.durationHours <= 0) { setError('Duration must be greater than 0'); return }

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
          batchId:           form.batchId,
          facultyId:         form.facultyId,
          subject:           form.subject.trim(),
          chapter:           form.chapter.trim(),
          syllabusChapterId: form.syllabusChapterId ?? undefined,
          startTime:         form.startTime || undefined,
          durationHours:     form.durationHours + form.durationMinutes / 60,
          sessionDate:       form.sessionDate,
        },
      })
      toast.success('Session logged', 'The session has been recorded. The form has been reset.')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm(EMPTY_FORM(assignedBatchId ?? ''))
        setChapters([])
      }, 2000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to submit session'
      if (msg.includes('video lessons not yet marked complete')) {
        setError(msg + ' → Go to "Chapters" in the sidebar to mark it complete first.')
      } else {
        setError(msg)
      }
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
            needsVideoFirst={needsVideoFirst}
            batches={batches}
            value={form.batchId}
            onChange={(v) => setField('batchId', v)}
          />

          {needsVideoFirst && (
            <div className="alert" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--color-warning)', padding: '0.75rem 1rem' }}>
              <span style={{ marginRight: '0.5rem' }}>🎬</span>
              <strong>Video-first batch.</strong> Only chapters with video marked complete can be logged.
              Use the <strong>Chapters</strong> page to mark videos done before logging sessions.
            </div>
          )}

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

          <ChapterSelector
            loadingCh={loadingCh}
            loadingSyllabus={loadingSyllabus}
            syllabusChapters={syllabusChapters}
            syllabusChaptersByMonth={syllabusChaptersByMonth}
            chapters={chapters}
            needsVideoFirst={needsVideoFirst}
            subject={form.subject}
            value={form.chapter}
            onSelect={selectChapter}
          />

          <DurationDateFields
            startTime={form.startTime}
            onStartTimeChange={(v) => setField('startTime', v)}
            durationHours={form.durationHours}
            onDurationHoursChange={(v) => setField('durationHours', v)}
            durationMinutes={form.durationMinutes}
            onDurationMinutesChange={(v) => setField('durationMinutes', v)}
            sessionDate={form.sessionDate}
            onSessionDateChange={(v) => setField('sessionDate', v)}
          />

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
