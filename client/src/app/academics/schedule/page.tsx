'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassEntryDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
type ClassSessionType = 'LIVE_SESSION' | 'RECORDED_VIDEO' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

interface ClassEntry {
  day: ClassEntryDay
  subject: string
  chapter: string
  sessionType: ClassSessionType
  durationHours?: number
  facultyId?: string | { _id: string; name: string; subject: string }
  notes?: string
  /** Optional exact date for this session — auto-derives the day dropdown */
  sessionDate?: string
  /** Optional start time as HH:MM */
  startTime?: string
  /** WEEKLY_EXAM only — which day the exam sits on */
  examDay?: 'MONDAY' | 'FRIDAY'
  /** WEEKLY_EXAM / MONTHLY_EXAM — specific exam date (YYYY-MM-DD) */
  examDate?: string
}

interface Schedule {
  _id: string
  batchId: string | { _id: string; name: string; type: string }
  weekStartDate: string
  weekEndDate: string
  mondayExamTopic?: string
  fridayExamTopic?: string
  classEntries: ClassEntry[]
  isPublished: boolean
  publishedAt?: string
  isRevised: boolean
  replacesScheduleId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS: { value: ClassEntryDay; label: string }[] = [
  { value: 'MONDAY',    label: 'Monday' },
  { value: 'TUESDAY',   label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY',  label: 'Thursday' },
  { value: 'FRIDAY',    label: 'Friday' },
  { value: 'SATURDAY',  label: 'Saturday' },
  { value: 'SUNDAY',    label: 'Sunday' },
]

const DAY_LABELS: Record<ClassEntryDay, string> = {
  MONDAY:    'Monday',
  TUESDAY:   'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY:  'Thursday',
  FRIDAY:    'Friday',
  SATURDAY:  'Saturday',
  SUNDAY:    'Sunday',
}

const SESSION_TYPE_LABELS: Record<ClassSessionType, string> = {
  LIVE_SESSION:   'Live Session',
  RECORDED_VIDEO: 'Recorded Video',
  WEEKLY_EXAM:    'Weekly Exam',
  MONTHLY_EXAM:   'Monthly Exam',
}

const SESSION_TYPE_BADGE: Record<ClassSessionType, { cls: string; icon: string }> = {
  LIVE_SESSION:   { cls: 'badge-blue',   icon: '🎓' },
  RECORDED_VIDEO: { cls: 'badge-purple', icon: '🎬' },
  WEEKLY_EXAM:    { cls: 'badge-orange', icon: '📝' },
  MONTHLY_EXAM:   { cls: 'badge-red',    icon: '📋' },
}

function dayFromDateStr(dateStr: string): ClassEntryDay {
  const days: ClassEntryDay[] = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

/** Return today's date as YYYY-MM-DD (default week start) */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getBatchName(b: string | { _id: string; name: string } | null | undefined): string {
  if (!b) return '—'
  if (typeof b === 'object') return b.name
  return b
}

function getFacultyName(f: string | { _id: string; name: string } | undefined): string {
  if (!f) return '—'
  if (typeof f === 'object') return f.name
  return f
}

const EMPTY_ENTRY = (): ClassEntry => ({ day: 'TUESDAY', subject: '', chapter: '', sessionType: 'LIVE_SESSION', durationHours: undefined, facultyId: '', notes: '' })

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)
  const isCoordinator = role === 'COORDINATOR'

  const [schedules, setSchedules]     = useState<Schedule[]>([])
  const [batches,   setBatches]       = useState<Batch[]>([])
  const [faculty,   setFaculty]       = useState<Faculty[]>([])
  const [batchId,   setBatchId]       = useState('')
  const [weekStart, setWeekStart]     = useState(todayStr)
  const [saving,    setSaving]        = useState(false)
  const [publishing, setPublishing]   = useState('')
  const [revising,  setRevising]      = useState('')
  const [error,     setError]         = useState('')
  const [success,   setSuccess]       = useState('')

  // Form state
  const [entries, setEntries] = useState<ClassEntry[]>([EMPTY_ENTRY()])

  const canEdit = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'ACADEMICS_MANAGER' || role === 'COORDINATOR'
  const canPublish = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'ACADEMICS_MANAGER' || role === 'COORDINATOR'
  const canRevise  = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'ACADEMICS_MANAGER'

  const load = useCallback(() => {
    if (!accessToken) return
    const url = batchId ? `/academics/schedules?batchId=${batchId}` : '/academics/schedules'
    apiFetch<Schedule[]>(url, { token: accessToken }).then(setSchedules).catch(console.error)
  }, [accessToken, batchId])

  useEffect(() => {
    if (!accessToken) return
    load()
    getFaculty(accessToken).then(setFaculty).catch(console.error)
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'IG')
      const visible = isCoordinator && coordinatorBatchId
        ? ac.filter((b) => b._id === coordinatorBatchId)
        : ac
      setBatches(visible)
      if (visible.length && !batchId) setBatchId(visible[0]._id)
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => { if (batchId) load() }, [batchId, load])

  // ── Entry helpers ───────────────────────────────────────────────────────────

  function updateEntry(idx: number, key: keyof ClassEntry, val: string) {
    setEntries((prev) => prev.map((e, i) => {
      if (i !== idx) return e
      const updated: ClassEntry = { ...e, [key]: val }
      // When exam day changes, sync the row's day too
      if (key === 'examDay' && val) updated.day = val as ClassEntryDay
      // When exam date changes on a monthly exam, derive the day of week
      if (key === 'examDate' && val && e.sessionType === 'MONTHLY_EXAM') updated.day = dayFromDateStr(val)
      // When sessionDate is picked, auto-derive and lock the day dropdown
      if (key === 'sessionDate' && val) updated.day = dayFromDateStr(val)
      // Switching type — clear exam fields when going back to class sessions
      if (key === 'sessionType') {
        if (val === 'LIVE_SESSION' || val === 'RECORDED_VIDEO') {
          updated.examDay = undefined
          updated.examDate = undefined
        }
      }
      return updated
    }))
  }

  function addEntry() { setEntries((prev) => [...prev, EMPTY_ENTRY()]) }

  function removeEntry(idx: number) { setEntries((prev) => prev.filter((_, i) => i !== idx)) }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!accessToken) return
    if (!batchId)     { setError('Select a batch'); return }
    if (!weekStart)   { setError('Select a week start date'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const validEntries = entries.filter((e) => e.subject.trim() && e.chapter.trim())
      await apiFetch('/academics/schedules', {
        token: accessToken,
        method: 'POST',
        body: {
          batchId,
          weekStartDate: weekStart,
          classEntries: validEntries.map((e) => ({
            day:          e.day,
            subject:      e.subject.trim(),
            chapter:      e.chapter.trim(),
            sessionType:  e.sessionType,
            durationHours: e.durationHours ? Number(e.durationHours) : undefined,
            facultyId:    typeof e.facultyId === 'object' ? (e.facultyId as {_id:string})._id : (e.facultyId || undefined),
            sessionDate:  e.sessionDate || undefined,
            startTime:    e.startTime?.trim() || undefined,
            examDay:      e.examDay || undefined,
            examDate:     e.examDate || undefined,
            notes:        e.notes?.trim() || undefined,
          })),
        },
      })
      setSuccess('Schedule saved successfully!')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  // ── Publish ─────────────────────────────────────────────────────────────────

  async function handlePublish(scheduleId: string) {
    if (!accessToken) return
    setPublishing(scheduleId); setError('')
    try {
      await apiFetch(`/academics/schedules/${scheduleId}/publish`, { token: accessToken, method: 'POST' })
      setSuccess('Schedule published successfully.')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally { setPublishing('') }
  }

  // ── Revise ──────────────────────────────────────────────────────────────────

  async function handleRevise(scheduleId: string) {
    if (!accessToken) return
    setRevising(scheduleId); setError('')
    try {
      await apiFetch<{ revision: Schedule }>(`/academics/schedules/${scheduleId}/revise`, {
        token: accessToken, method: 'POST',
      })
      setSuccess('Revision draft created. Edit and publish the draft to replace the current schedule.')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Revise failed')
    } finally { setRevising('') }
  }

  // ── Sorted schedules ────────────────────────────────────────────────────────

  const sorted = useMemo(() =>
    [...schedules].sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()),
    [schedules]
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Weekly Schedule</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Live Sessions &amp; Recorded Videos scheduled per batch
          </p>
        </div>
      </div>

      {/* ── Create / Update Form ─────────────────────────────────────────── */}
      {canEdit && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>
            Create / Update Schedule
          </h2>

          {error   && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}><span className="alert-icon">✅</span>{success}</div>}

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="label">Batch</label>
            <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}
              disabled={isCoordinator} style={{ maxWidth: 320 }}>
              <option value="">— select batch —</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
            </select>
          </div>

          {/* Class entries */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                📚 Class Entries — Live Sessions &amp; Recorded Videos
              </h3>
              <button className="btn btn-outline btn-sm" onClick={addEntry}>+ Add Row</button>
            </div>
            {entries.map((entry, idx) => {
              const isExam = entry.sessionType === 'WEEKLY_EXAM' || entry.sessionType === 'MONTHLY_EXAM'
              return (
                <div key={idx} className="schedule-entry-row">
                  {/* Type — always first */}
                  <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
                    {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Type</label>}
                    <select className="input" value={entry.sessionType}
                      onChange={(e) => updateEntry(idx, 'sessionType', e.target.value as ClassSessionType)}
                      style={{ fontSize: '0.8125rem' }}>
                      {(Object.keys(SESSION_TYPE_LABELS) as ClassSessionType[]).map((t) => (
                        <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Day dropdown — class sessions only; auto-set when sessionDate is picked */}
                  {!isExam && (
                    <div className="form-group" style={{ margin: 0 }}>
                      {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Day</label>}
                      <select className="input" value={entry.day}
                        onChange={(e) => updateEntry(idx, 'day', e.target.value as ClassEntryDay)}
                        style={{ fontSize: '0.8125rem' }}>
                        {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Date picker — class sessions: optional, auto-derives day */}
                  {!isExam && (
                    <div className="form-group" style={{ margin: 0 }}>
                      {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Date (optional)</label>}
                      <input type="date" className="input" value={entry.sessionDate ?? ''}
                        onChange={(e) => updateEntry(idx, 'sessionDate', e.target.value)}
                        style={{ fontSize: '0.8125rem' }} />
                    </div>
                  )}

                  {/* Start time — class sessions: optional */}
                  {!isExam && (
                    <div className="form-group" style={{ margin: 0, minWidth: 110 }}>
                      {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Start Time</label>}
                      <input type="time" className="input" value={entry.startTime ?? ''}
                        onChange={(e) => updateEntry(idx, 'startTime', e.target.value)}
                        style={{ fontSize: '0.8125rem' }} />
                    </div>
                  )}

                  {/* Weekly exam day (Mon/Fri) */}
                  {entry.sessionType === 'WEEKLY_EXAM' && (
                    <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
                      {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Exam Day</label>}
                      <select className="input" value={entry.examDay ?? ''}
                        onChange={(e) => updateEntry(idx, 'examDay', e.target.value)}
                        style={{ fontSize: '0.8125rem' }}>
                        <option value="">— day —</option>
                        <option value="MONDAY">Monday</option>
                        <option value="FRIDAY">Friday</option>
                      </select>
                    </div>
                  )}

                  {/* Exam date — both exam types */}
                  {isExam && (
                    <div className="form-group" style={{ margin: 0 }}>
                      {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Exam Date</label>}
                      <input type="date" className="input" value={entry.examDate ?? ''}
                        onChange={(e) => updateEntry(idx, 'examDate', e.target.value)}
                        style={{ fontSize: '0.8125rem' }} />
                    </div>
                  )}

                  {/* Subject */}
                  <div className="form-group" style={{ margin: 0 }}>
                    {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Subject</label>}
                    <input className="input" placeholder="Subject" value={entry.subject}
                      onChange={(e) => updateEntry(idx, 'subject', e.target.value)}
                      style={{ fontSize: '0.8125rem' }} />
                  </div>

                  {/* Chapter */}
                  <div className="form-group" style={{ margin: 0 }}>
                    {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Chapter / Topic</label>}
                    <input className="input" placeholder="Chapter" value={entry.chapter}
                      onChange={(e) => updateEntry(idx, 'chapter', e.target.value)}
                      style={{ fontSize: '0.8125rem' }} />
                  </div>

                  {/* Faculty — class sessions only */}
                  {!isExam && (
                    <div className="form-group" style={{ margin: 0 }}>
                      {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Faculty (optional)</label>}
                      <select className="input"
                        value={typeof entry.facultyId === 'object' ? (entry.facultyId as {_id:string})._id : (entry.facultyId ?? '')}
                        onChange={(e) => updateEntry(idx, 'facultyId', e.target.value)}
                        style={{ fontSize: '0.8125rem' }}>
                        <option value="">— any —</option>
                        {faculty.filter((f) => f.isActive).map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                      </select>
                    </div>
                  )}

                  <button className="btn btn-ghost btn-sm" onClick={() => removeEntry(idx)}
                    style={{ alignSelf: 'flex-end', color: 'var(--color-danger)', paddingBottom: idx === 0 ? '0' : undefined }}>✕</button>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : '💾 Save Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* ── Filter ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '0.875rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Filter by batch:</span>
          <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}
            style={{ minWidth: 200 }} disabled={isCoordinator}>
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Schedules list ───────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🗓</div>
            <h3>No schedules yet</h3>
            <p>Use the form above to create the first weekly schedule.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sorted.map((s) => {
            const bName   = getBatchName(s.batchId as string | { _id: string; name: string })
            const wStart  = fmtDate(s.weekStartDate)
            const wEnd    = s.weekEndDate ? fmtDate(s.weekEndDate) : '—'
            const isDraft = !s.isPublished

            return (
              <div key={s._id} className="card" style={{
                borderLeft: `4px solid ${s.isPublished ? 'var(--color-success)' : s.isRevised ? 'var(--color-warning)' : 'var(--color-primary)'}`,
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{bName}</span>
                      <span className={`badge ${s.isPublished ? 'badge-green' : s.isRevised ? 'badge-yellow' : 'badge-blue'}`}>
                        {s.isPublished ? '✓ Published' : s.isRevised ? 'Revised Draft' : 'Draft'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                      {wStart} → {wEnd}
                      {s.publishedAt && <span style={{ marginLeft: '0.75rem' }}>Published {fmtDate(s.publishedAt)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {isDraft && canPublish && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={publishing === s._id}
                        onClick={() => handlePublish(s._id)}
                      >
                        {publishing === s._id ? 'Publishing…' : '📢 Publish'}
                      </button>
                    )}
                    {s.isPublished && canRevise && (
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={revising === s._id}
                        onClick={() => handleRevise(s._id)}
                        style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
                      >
                        {revising === s._id ? 'Creating…' : '✏ Revise'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Class entries */}
                {s.classEntries.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                      Class Entries
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {s.classEntries.map((entry, i) => {
                        const t = (entry as ClassEntry).sessionType
                        const badge = SESSION_TYPE_BADGE[t] ?? { cls: 'badge-gray', icon: '📌' }
                        const isExam = t === 'WEEKLY_EXAM' || t === 'MONTHLY_EXAM'
                        const ce = entry as ClassEntry
                        return (
                          <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem 0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontWeight: 600, minWidth: 80, color: 'var(--color-primary)', fontSize: '0.8125rem' }}>
                              {isExam && ce.examDate
                                ? fmtDate(ce.examDate)
                                : (DAY_LABELS[entry.day as ClassEntryDay] ?? entry.day)}
                            </span>
                            <span className={`badge ${badge.cls}`} style={{ fontSize: '0.7rem' }}>
                              {badge.icon} {SESSION_TYPE_LABELS[t]}
                            </span>
                            {isExam && ce.examDay && (
                              <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                                {DAY_LABELS[ce.examDay]}
                              </span>
                            )}
                            <span style={{ fontWeight: 500 }}>{entry.subject}</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>— {entry.chapter}</span>
                            {!isExam && entry.facultyId && (
                              <span style={{ color: 'var(--color-muted)', marginLeft: 'auto', fontSize: '0.8125rem' }}>
                                👤 {getFacultyName(entry.facultyId as string | { _id: string; name: string })}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
