'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

interface FormState {
  batchId: string
  facultyId: string
  subject: string
  chapter: string
  syllabusChapterId?: string
  startTime: string
  durationHours: number
  durationMinutes: number
  sessionDate: string
}

const MONTH_NAMES: Record<number, string> = {
  6: 'June', 7: 'July', 8: 'August', 9: 'September',
  10: 'October', 11: 'November', 12: 'December',
}

const NEET_SUBJECTS = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY']

interface BatchChapter {
  _id: string
  subject: string
  chapterName: string
  syllabusChapterId?: string
  videoComplete: boolean
  facultyClassDone: boolean
}

interface SyllabusChapter {
  _id: string
  subject: string
  chapterName: string
  scheduledMonth: number
  chapterOrder: number
  isSplitPart: boolean
  splitPartNumber?: number
}

const EMPTY_FORM = (defaultBatchId = ''): FormState => ({
  batchId:           defaultBatchId,
  facultyId:         '',
  subject:           '',
  chapter:           '',
  syllabusChapterId: undefined,
  startTime:         '',
  durationHours:     1,
  durationMinutes:   0,
  sessionDate:       new Date().toISOString().slice(0, 10),
})

export default function LogSessionPage() {
  const { accessToken, batchId: assignedBatchId } = useAppSelector((s) => s.auth)

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
            <select className="input" value={form.subject} onChange={(e) => setField('subject', e.target.value as FormState['subject'])}>
              <option value="">— select subject —</option>
              <option value="PHYSICS">Physics</option>
              <option value="CHEMISTRY">Chemistry</option>
              <option value="BIOLOGY">Biology</option>
            </select>
          </div>

          {/* Chapter / Topic */}
          <div className="form-group">
            <label className="label">Chapter / Topic</label>
            {(loadingCh || loadingSyllabus) ? (
              <div className="input" style={{ color: 'var(--color-muted)' }}>Loading chapters…</div>
            ) : syllabusChapters.length > 0 ? (
              <>
                <select className="input" value={form.chapter} onChange={(e) => selectChapter(e.target.value)}>
                  <option value="">— select chapter —</option>
                  {Object.entries(syllabusChaptersByMonth)
                    .sort(([a], [b]) => +a - +b)
                    .map(([month, chs]) => (
                      <optgroup key={month} label={MONTH_NAMES[+month] ?? `Month ${month}`}>
                        {chs.map((ch) => {
                          const bc = chapters.find((b) =>
                            (b.syllabusChapterId && b.syllabusChapterId === ch._id) ||
                            b.chapterName === ch.chapterName
                          )
                          const done     = bc?.facultyClassDone
                          const videoOk  = !needsVideoFirst || bc?.videoComplete
                          const disabled = Boolean(done) || (needsVideoFirst && !videoOk)
                          const suffix   = done ? ' ✓' : needsVideoFirst && !videoOk ? ' 🔒' : ''
                          return (
                            <option key={ch._id} value={ch.chapterName} disabled={disabled}>
                              {ch.chapterName}{suffix}
                            </option>
                          )
                        })}
                      </optgroup>
                    ))}
                </select>
                {needsVideoFirst && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', margin: '0.25rem 0 0' }}>
                    🔒 Video not yet complete &nbsp;·&nbsp; ✓ Already logged
                  </p>
                )}
              </>
            ) : (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
                {form.subject ? 'No syllabus chapters found for this subject.' : 'Select a subject to load chapters.'}
              </div>
            )}
          </div>

          {/* Start Time + Duration + Date */}
          <div className="input-group">
            <div className="form-group">
              <label className="label">Start Time</label>
              <input
                type="time"
                className="input"
                value={form.startTime}
                onChange={(e) => setField('startTime', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Duration</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="input"
                  min={0}
                  max={12}
                  style={{ width: '5rem' }}
                  value={form.durationHours}
                  onChange={(e) => setField('durationHours', +e.target.value)}
                  placeholder="hrs"
                />
                <select
                  className="input"
                  style={{ width: '5rem' }}
                  value={form.durationMinutes}
                  onChange={(e) => setField('durationMinutes', +e.target.value)}
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}m</option>
                  ))}
                </select>
              </div>
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
