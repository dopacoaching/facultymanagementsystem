'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassEntry {
  day: 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
  subject: string
  chapter: string
  /** Planned duration in hours — entered by Academics Manager */
  durationHours?: number
  facultyId?: string | { _id: string; name: string; subject: string }
  notes?: string
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

interface SuggestResponse {
  suggestion: {
    topic: string
    isPending: boolean
    case: number
    excluded: { chapterName: string; subject: string; reason: string }[]
    /** true when a Friday exam found no this-week chapters and fell back to older ones */
    usedFallback?: boolean
  }
  bySubject: { subject: string; chapters: string[] }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS: { value: ClassEntry['day']; label: string }[] = [
  { value: 'TUESDAY',   label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY',  label: 'Thursday' },
]

const DAY_LABELS: Record<ClassEntry['day'], string> = {
  TUESDAY:   'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY:  'Thursday',
}

/** Return the most recent Saturday on or before today as YYYY-MM-DD */
function lastSaturday(): string {
  const d = new Date()
  const diff = (d.getDay() + 1) % 7  // days since last Saturday (Sun=1,Mon=2,...Sat=0)
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
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

const EMPTY_ENTRY = (): ClassEntry => ({ day: 'TUESDAY', subject: '', chapter: '', durationHours: undefined, facultyId: '', notes: '' })

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)
  const isCoordinator = role === 'COORDINATOR'

  const [schedules, setSchedules]     = useState<Schedule[]>([])
  const [batches,   setBatches]       = useState<Batch[]>([])
  const [faculty,   setFaculty]       = useState<Faculty[]>([])
  const [batchId,   setBatchId]       = useState('')
  const [weekStart, setWeekStart]     = useState(lastSaturday)
  const [saving,    setSaving]        = useState(false)
  const [publishing, setPublishing]   = useState('')
  const [revising,  setRevising]      = useState('')
  const [error,     setError]         = useState('')
  const [success,   setSuccess]       = useState('')

  // Form state
  const [mondayTopic, setMondayTopic]   = useState('')
  const [fridayTopic, setFridayTopic]   = useState('')
  const [entries, setEntries]           = useState<ClassEntry[]>([EMPTY_ENTRY()])

  // Suggestion
  const [suggestion, setSuggestion]   = useState<SuggestResponse | null>(null)
  const [suggesting, setSuggesting]   = useState(false)

  // Exam topic inline edit (for draft schedules)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [topicDraft, setTopicDraft]         = useState({ monday: '', friday: '' })
  const [topicSaving, setTopicSaving]       = useState(false)

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
      const ac = list.filter((b) => b.type !== 'INTEGRATED_SCHOOL')
      const visible = isCoordinator && coordinatorBatchId
        ? ac.filter((b) => b._id === coordinatorBatchId)
        : ac
      setBatches(visible)
      if (visible.length && !batchId) setBatchId(visible[0]._id)
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => { if (batchId) load() }, [batchId, load])

  // ── Suggestion ──────────────────────────────────────────────────────────────

  async function fetchSuggestion(forDay: 'monday' | 'friday') {
    if (!accessToken || !batchId || !weekStart) return
    setSuggesting(true)
    try {
      // Monday exam = week start (Sat) + 2 days; Friday exam = week start + 6 days
      const base = new Date(weekStart)
      const examDate = new Date(base)
      examDate.setDate(base.getDate() + (forDay === 'monday' ? 2 : 6))

      // GAP 4: always send weekStartDate so the server can apply the Saturday cutoff
      // for Monday exams and the this-week preference for Friday exams (GAP 5).
      const params = new URLSearchParams({
        batchId,
        examDate:      examDate.toISOString().slice(0, 10),
        weekStartDate: base.toISOString().slice(0, 10),
      })
      const data = await apiFetch<SuggestResponse>(
        `/academics/exams/suggest?${params.toString()}`,
        { token: accessToken }
      )
      setSuggestion(data)
      // Auto-fill the topic field if not pending
      if (!data.suggestion.isPending) {
        if (forDay === 'monday') setMondayTopic(data.suggestion.topic)
        else setFridayTopic(data.suggestion.topic)
      }
    } catch (e: unknown) {
      console.error(e)
    } finally { setSuggesting(false) }
  }

  // ── Entry helpers ───────────────────────────────────────────────────────────

  function updateEntry(idx: number, key: keyof ClassEntry, val: string) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [key]: val } : e))
  }

  function addEntry() { setEntries((prev) => [...prev, EMPTY_ENTRY()]) }

  function removeEntry(idx: number) { setEntries((prev) => prev.filter((_, i) => i !== idx)) }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!accessToken) return
    if (!batchId)     { setError('Select a batch'); return }
    if (!weekStart)   { setError('Select a week start date (Saturday)'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const validEntries = entries.filter((e) => e.subject.trim() && e.chapter.trim())
      await apiFetch('/academics/schedules', {
        token: accessToken,
        method: 'POST',
        body: {
          batchId,
          weekStartDate: weekStart,
          mondayExamTopic: mondayTopic || undefined,
          fridayExamTopic: fridayTopic || undefined,
          classEntries: validEntries.map((e) => ({
            day:          e.day,
            subject:      e.subject.trim(),
            chapter:      e.chapter.trim(),
            durationHours: e.durationHours ? Number(e.durationHours) : undefined,
            facultyId:    typeof e.facultyId === 'object' ? (e.facultyId as {_id:string})._id : (e.facultyId || undefined),
            notes:        e.notes?.trim() || undefined,
          })),
        },
      })
      setSuccess('Schedule saved successfully!')
      setSuggestion(null)
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

  // ── Inline topic edit ───────────────────────────────────────────────────────

  function startEditTopic(s: Schedule) {
    setEditingTopicId(s._id)
    setTopicDraft({ monday: s.mondayExamTopic ?? '', friday: s.fridayExamTopic ?? '' })
  }

  async function saveTopicEdit() {
    if (!accessToken || !editingTopicId) return
    setTopicSaving(true); setError('')
    try {
      await apiFetch(`/academics/schedules/${editingTopicId}/exam-topic`, {
        token: accessToken,
        method: 'PATCH',
        body: { mondayExamTopic: topicDraft.monday, fridayExamTopic: topicDraft.friday },
      })
      setEditingTopicId(null)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Topic update failed')
    } finally { setTopicSaving(false) }
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
            Saturday → Friday academic week — Exams on Monday &amp; Friday
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

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="label">Batch</label>
              <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}
                disabled={isCoordinator}>
                <option value="">— select batch —</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Week Start Date <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(must be Saturday)</span></label>
              <input type="date" className="input" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
            </div>
          </div>

          {/* Exam topics */}
          <div style={{ background: 'rgba(79,70,229,.04)', border: '1px solid rgba(79,70,229,.12)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.875rem', color: 'var(--color-primary)' }}>
              📝 Exam Topics (Monday &amp; Friday)
            </h3>
            <div className="exam-topic-grid">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Monday Exam Topic</label>
                <input className="input" value={mondayTopic}
                  onChange={(e) => setMondayTopic(e.target.value)} placeholder="e.g. Exam: Organic Ch 4 + Redox" />
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => fetchSuggestion('monday')} disabled={suggesting || !batchId || !weekStart} style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>
                {suggesting ? '…' : '✨ Suggest'}
              </button>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Friday Exam Topic</label>
                <input className="input" value={fridayTopic}
                  onChange={(e) => setFridayTopic(e.target.value)} placeholder="e.g. Exam: Mechanics Ch 2" />
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => fetchSuggestion('friday')} disabled={suggesting || !batchId || !weekStart} style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>
                {suggesting ? '…' : '✨ Suggest'}
              </button>
            </div>

            {/* Suggestion result */}
            {suggestion && (
              <div style={{ marginTop: '0.875rem', padding: '0.75rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    Case {suggestion.suggestion.case} suggestion:
                  </span>
                  <span
                    className={`badge ${suggestion.suggestion.isPending ? 'badge-yellow' : 'badge-green'}`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {suggestion.suggestion.isPending ? 'Pending' : 'Auto-filled'}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 500, marginBottom: '0.5rem' }}>
                  {suggestion.suggestion.topic}
                </div>
                {/* GAP 5: Friday fallback notice */}
                {suggestion.suggestion.usedFallback && (
                  <div style={{
                    fontSize: '0.75rem', color: '#92400e', marginBottom: '0.375rem',
                    padding: '0.3rem 0.5rem', borderRadius: '0.25rem',
                    background: '#fef3c7', border: '1px solid #f59e0b',
                  }}>
                    ⚠ No new chapters completed this week — using earlier chapter as fallback.
                  </div>
                )}
                {suggestion.suggestion.excluded.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Excluded (buffer):</span>{' '}
                    {suggestion.suggestion.excluded.map((ex) => ex.chapterName).join(', ')}
                  </div>
                )}
                {suggestion.bySubject.length > 0 && (
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--color-muted)' }}>All eligible chapters</summary>
                    <div style={{ marginTop: '0.25rem' }}>
                      {suggestion.bySubject.map((s) => (
                        <div key={s.subject} style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                          <strong>{s.subject}:</strong> {s.chapters.join(', ') || 'none'}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* Class entries */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                📚 Class Entries (Tue / Wed / Thu)
              </h3>
              <button className="btn btn-outline btn-sm" onClick={addEntry}>+ Add Row</button>
            </div>
            {entries.map((entry, idx) => (
              <div key={idx} className="schedule-entry-row">
                <div className="form-group" style={{ margin: 0 }}>
                  {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Day</label>}
                  <select className="input" value={entry.day} onChange={(e) => updateEntry(idx, 'day', e.target.value as ClassEntry['day'])} style={{ fontSize: '0.8125rem' }}>
                    {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Subject</label>}
                  <input className="input" placeholder="Subject" value={entry.subject} onChange={(e) => updateEntry(idx, 'subject', e.target.value)} style={{ fontSize: '0.8125rem' }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Chapter / Topic</label>}
                  <input className="input" placeholder="Chapter" value={entry.chapter} onChange={(e) => updateEntry(idx, 'chapter', e.target.value)} style={{ fontSize: '0.8125rem' }} />
                </div>
                <div className="form-group" style={{ margin: 0, maxWidth: 90 }}>
                  {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Hrs (planned)</label>}
                  <input type="number" className="input" min={0.5} max={12} step={0.5}
                    placeholder="hrs"
                    value={entry.durationHours ?? ''}
                    onChange={(e) => updateEntry(idx, 'durationHours', e.target.value)}
                    style={{ fontSize: '0.8125rem' }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  {idx === 0 && <label className="label" style={{ fontSize: '0.75rem' }}>Faculty (optional)</label>}
                  <select className="input" value={typeof entry.facultyId === 'object' ? (entry.facultyId as {_id:string})._id : (entry.facultyId ?? '')} onChange={(e) => updateEntry(idx, 'facultyId', e.target.value)} style={{ fontSize: '0.8125rem' }}>
                    <option value="">— any —</option>
                    {faculty.filter((f) => f.isActive).map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => removeEntry(idx)} style={{ alignSelf: 'flex-end', color: 'var(--color-danger)', paddingBottom: idx === 0 ? '0' : undefined }}>✕</button>
              </div>
            ))}
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
                    {isDraft && !editingTopicId && canEdit && (
                      <button className="btn btn-outline btn-sm" onClick={() => startEditTopic(s)}>Edit Topics</button>
                    )}
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

                {/* Inline topic editor */}
                {editingTopicId === s._id ? (
                  <div style={{ background: 'rgba(79,70,229,.04)', border: '1px solid rgba(79,70,229,.12)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.875rem' }}>
                    <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label">Monday Exam Topic</label>
                        <input className="input" value={topicDraft.monday} onChange={(e) => setTopicDraft({ ...topicDraft, monday: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label">Friday Exam Topic</label>
                        <input className="input" value={topicDraft.friday} onChange={(e) => setTopicDraft({ ...topicDraft, friday: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingTopicId(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" disabled={topicSaving} onClick={saveTopicEdit}>
                        {topicSaving ? 'Saving…' : 'Save Topics'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Exam topic display */
                  <div className="input-group" style={{ marginBottom: s.classEntries.length > 0 ? '0.875rem' : 0 }}>
                    {[
                      { label: 'Monday Exam', value: s.mondayExamTopic, color: '#7c3aed' },
                      { label: 'Friday Exam', value: s.fridayExamTopic, color: '#0891b2' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', background: `${color}10`, border: `1px solid ${color}30` }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color, marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontSize: '0.875rem', color: value ? 'var(--color-text)' : 'var(--color-muted)', fontStyle: value ? 'normal' : 'italic' }}>
                          {value || 'Not set'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Class entries */}
                {s.classEntries.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                      Class Entries
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {s.classEntries.map((entry, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem 0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontWeight: 600, minWidth: 80, color: 'var(--color-primary)', fontSize: '0.8125rem' }}>
                            {DAY_LABELS[entry.day as ClassEntry['day']]}
                          </span>
                          <span style={{ fontWeight: 500 }}>{entry.subject}</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>— {entry.chapter}</span>
                          {(entry as ClassEntry).durationHours && (
                            <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                              {(entry as ClassEntry).durationHours}h
                            </span>
                          )}
                          {entry.facultyId && (
                            <span style={{ color: 'var(--color-muted)', marginLeft: 'auto', fontSize: '0.8125rem' }}>
                              👤 {getFacultyName(entry.facultyId as string | { _id: string; name: string })}
                            </span>
                          )}
                        </div>
                      ))}
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
