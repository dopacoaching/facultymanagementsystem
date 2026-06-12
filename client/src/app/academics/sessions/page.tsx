'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, create, cancel } from '@/services/session.service'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Session, Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { SkeletonTable, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:     'badge-blue',
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  NOT_COMPLETED: 'badge-yellow',
}

const STATUS_OPTIONS = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOT_COMPLETED']

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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

function getBatchType(batchId: string, batches: Batch[]): string {
  return batches.find((b) => b._id === batchId)?.type ?? ''
}

export default function SessionsPage() {
  const { accessToken, role, batchType: scopedBatchType } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const [sessions, setSessions]       = useState<Session[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [cancelling, setCancelling]   = useState('')
  const [form, setForm] = useState({
    facultyId: '', batchId: '', subject: '', chapter: '',
    syllabusChapterId: undefined as string | undefined,
    startTime: '',
    durationHours: 1,
    durationMinutes: 0,
    sessionDate: todayLocal(),
  })
  const [saving, setSaving]           = useState(false)
  const [cancelInitiator, setCancelInitiator] = useState<Record<string, string>>({})
  const [error, setError]             = useState('')

  // Per-batch chapter tracking (video / done status)
  const [chapters,        setChapters]        = useState<BatchChapter[]>([])
  const [loadingCh,       setLoadingCh]       = useState(false)
  // Annual syllabus chapters (grouped by month for the dropdown)
  const [syllabusChapters, setSyllabusChapters] = useState<SyllabusChapter[]>([])
  const [loadingSyllabus,  setLoadingSyllabus]  = useState(false)

  // Filters
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('ALL')
  const [filterMonth, setFilterMonth] = useState(0)
  const [filterYear, setFilterYear]   = useState(0)
  const [filterBatch, setFilterBatch] = useState('')

  // Edit modal
  const [editing, setEditing]         = useState<Session | null>(null)
  const [editForm, setEditForm]       = useState({ facultyId: '', batchId: '', subject: '', chapter: '', sessionDate: '', durationHours: 1 })
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState('')

  const canEdit = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'ACADEMICS_MANAGER'

  // Derived: is the form's selected batch requiring video-first?
  const formBatchType = getBatchType(form.batchId, batches)
  const needsVideoFirst = formBatchType ? isVideoFirstBatch(formBatchType) : false

  const load = () => {
    if (accessToken) {
      setLoading(true)
      getAll({}, accessToken).then(setSessions).catch(console.error).finally(() => setLoading(false))
    }
  }

  useEffect(() => {
    if (!accessToken) return
    load()
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
    getBatches(accessToken).then((list) => {
      const acBatches = list.filter((b) => b.type !== 'IG' && (!scopedBatchType || b.type === scopedBatchType))
      setBatches(acBatches)
      if (acBatches.length) setForm((f) => ({ ...f, batchId: acBatches[0]._id }))
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Load per-batch chapter status (video complete / already done) for all batch types
  useEffect(() => {
    if (!accessToken || !form.batchId || !form.subject) { setChapters([]); return }
    setLoadingCh(true)
    const url = `/academics/chapters?batchId=${form.batchId}&subject=${encodeURIComponent(form.subject.toUpperCase())}`
    apiFetch<BatchChapter[]>(url, { token: accessToken })
      .then(setChapters).catch(console.error).finally(() => setLoadingCh(false))
  }, [accessToken, form.batchId, form.subject])

  // Load syllabus chapters (monthly plan) when subject is a NEET subject
  useEffect(() => {
    const subjUp = form.subject.toUpperCase()
    if (!accessToken || !NEET_SUBJECTS.includes(subjUp)) { setSyllabusChapters([]); return }
    setLoadingSyllabus(true)
    apiFetch<SyllabusChapter[]>(`/academics/syllabus/chapters?subject=${subjUp}`, { token: accessToken })
      .then(setSyllabusChapters).catch(console.error).finally(() => setLoadingSyllabus(false))
  }, [accessToken, form.subject])

  // Chapters grouped by month for the dropdown
  const syllabusChaptersByMonth = useMemo(() => {
    const map: Record<number, SyllabusChapter[]> = {}
    for (const ch of syllabusChapters) {
      if (!map[ch.scheduledMonth]) map[ch.scheduledMonth] = []
      map[ch.scheduledMonth].push(ch)
    }
    return map
  }, [syllabusChapters])

  // Other subjects (non-NEET) from faculty list for the subject dropdown
  const otherSubjects = useMemo(() => {
    const neet = new Set(NEET_SUBJECTS)
    return [...new Set(facultyList.map((f) => f.subject?.toUpperCase()).filter((s): s is string => Boolean(s) && !neet.has(s)))].sort()
  }, [facultyList])

  // ── Derived filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = sessions
    if (statusFilter !== 'ALL')  list = list.filter((s) => s.status === statusFilter)
    if (filterMonth > 0)         list = list.filter((s) => new Date(s.sessionDate).getMonth() + 1 === filterMonth)
    if (filterYear  > 0)         list = list.filter((s) => new Date(s.sessionDate).getFullYear() === filterYear)
    if (filterBatch)             list = list.filter((s) => s.batchId === filterBatch)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((s) =>
        s.subject.toLowerCase().includes(q) ||
        s.chapter.toLowerCase().includes(q) ||
        (typeof s.facultyId === 'object' ? s.facultyId?.name?.toLowerCase().includes(q) : String(s.facultyId).includes(q))
      )
    }
    return list
  }, [sessions, statusFilter, filterMonth, filterYear, filterBatch, search])

  const years = useMemo(() => {
    const set = new Set(sessions.map((s) => new Date(s.sessionDate).getFullYear()))
    return Array.from(set).sort((a, b) => b - a)
  }, [sessions])

  async function handleCreate() {
    if (!accessToken) return
    if (!form.facultyId || !form.batchId || !form.subject || !form.chapter) {
      setError('All fields are required'); return
    }
    const totalDuration = form.durationHours + form.durationMinutes / 60
    if (totalDuration <= 0) {
      setError('Duration must be greater than 0'); return
    }
    setSaving(true); setError('')
    try {
      await create({
        facultyId:         form.facultyId,
        batchId:           form.batchId,
        subject:           form.subject,
        chapter:           form.chapter,
        sessionDate:       form.sessionDate,
        durationHours:     totalDuration,
        startTime:         form.startTime || undefined,
        syllabusChapterId: form.syllabusChapterId ?? undefined,
      }, accessToken)
      toast.success('Session created', `${form.subject} session has been logged.`)
      setShowForm(false); load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create session'
      if (msg.includes('video lessons not yet marked complete')) {
        setError(msg + ' → Go to the Chapters page to mark video complete first.')
      } else {
        setError(msg)
      }
    } finally { setSaving(false) }
  }

  async function handleMarkComplete(id: string) {
    if (!accessToken) return
    try {
      await apiFetch(`/academics/sessions/${id}/status`, { method: 'PATCH', body: { status: 'COMPLETED' }, token: accessToken })
      load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to mark session complete') }
  }

  async function handleCancel(id: string) {
    if (!accessToken) return
    const initiator = cancelInitiator[id]
    if (!initiator) { setError('Select a cancellation initiator before cancelling.'); return }
    setCancelling(id)
    try {
      await cancel(id, initiator, accessToken)
      toast.info('Session cancelled', 'The session has been marked as cancelled.')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Cancel failed')
    } finally { setCancelling('') }
  }

  function openEdit(s: Session) {
    setEditing(s)
    setEditForm({
      facultyId:     typeof s.facultyId === 'object' ? s.facultyId._id : s.facultyId ?? '',
      batchId:       s.batchId ?? '',
      subject:       s.subject,
      chapter:       s.chapter,
      sessionDate:   s.sessionDate.slice(0, 10),
      durationHours: s.durationHours ?? 1,
    })
    setEditError('')
  }

  async function handleEditSave() {
    if (!accessToken || !editing) return
    setEditSaving(true); setEditError('')
    try {
      await apiFetch(`/academics/sessions/${editing._id}`, {
        method: 'PATCH',
        body: { ...editForm },
        token: accessToken,
      })
      toast.success('Session updated', 'Changes have been saved.')
      setEditing(null); load()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Edit failed')
    } finally { setEditSaving(false) }
  }

  const BATCH_TYPE_BADGE: Record<string, string> = {
    RESIDENTIAL: 'badge-purple',
    ONLINE:      'badge-blue',
    OFFLINE:     'badge-gray',
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Sessions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {filtered.length} of {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setError('') }}>+ New Session</button>
      </div>

      {/* Page-level error (table actions: mark complete, cancel) */}
      {error && !showForm && !editing && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} what="Action failed" onRetry={() => setError('')} />
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search faculty, subject, chapter…" value={search}
              onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
          </div>
          <select className="input" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <select className="input" value={statusFilter} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 140 }}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select className="input" value={filterMonth} onChange={(e) => setFilterMonth(+e.target.value)} style={{ minWidth: 110 }}>
            <option value={0}>All Months</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="input" value={filterYear} onChange={(e) => setFilterYear(+e.target.value)} style={{ minWidth: 100 }}>
            <option value={0}>All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {(search || statusFilter !== 'ALL' || filterMonth > 0 || filterYear > 0 || filterBatch) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatus('ALL'); setFilterMonth(0); setFilterYear(0); setFilterBatch('') }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── New Session Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <div
          role="dialog" aria-modal="true" aria-label="Log New Session"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setShowForm(false); setError('') } }}
        >
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 620, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>Log New Session</h2>
              <button onClick={() => { setShowForm(false); setError('') }} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{error}</div>}

              {needsVideoFirst && (
                <div className="alert" style={{ marginBottom: '1rem', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--color-warning)', padding: '0.75rem 1rem' }}>
                  <span style={{ marginRight: '0.5rem' }}>🎬</span>
                  <strong>{formBatchType}</strong> batch — only video-complete chapters can be logged.
                </div>
              )}

              <div className="input-group">
                <div className="form-group">
                  <label className="label">Faculty</label>
                  <select className="input" autoFocus value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
                    <option value="">— select —</option>
                    {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Batch</label>
                  <select className="input" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value, subject: '', chapter: '', syllabusChapterId: undefined })}>
                    <option value="">— select —</option>
                    {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Subject</label>
                  <select className="input" value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value, chapter: '', syllabusChapterId: undefined })}>
                    <option value="">— select subject —</option>
                    <option value="PHYSICS">Physics</option>
                    <option value="CHEMISTRY">Chemistry</option>
                    <option value="BIOLOGY">Biology</option>
                    {otherSubjects.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Chapter</label>
                  {(loadingCh || loadingSyllabus) ? (
                    <div className="input" style={{ color: 'var(--color-muted)' }}>Loading chapters…</div>
                  ) : syllabusChapters.length > 0 ? (
                    <>
                      <select className="input" value={form.chapter}
                        onChange={(e) => {
                          const ch = syllabusChapters.find((c) => c.chapterName === e.target.value)
                          setForm({ ...form, chapter: e.target.value, syllabusChapterId: ch?._id ?? undefined })
                        }}>
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
                    <input className="input" value={form.chapter}
                      onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                      placeholder={form.subject ? 'Enter chapter or topic' : 'Select a subject first'} />
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Duration</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number" className="input" min={0} max={12} style={{ width: '5rem' }}
                      value={form.durationHours}
                      onChange={(e) => setForm({ ...form, durationHours: Math.max(0, +e.target.value) })}
                      aria-label="Duration hours" placeholder="hrs"
                    />
                    <select
                      className="input" style={{ width: '5rem' }}
                      value={form.durationMinutes}
                      onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })}
                      aria-label="Duration minutes"
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <option key={m} value={m}>{m}m</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Session Date</label>
                  <input type="date" className="input" value={form.sessionDate} max={todayLocal()} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving || (needsVideoFirst && !form.chapter)}>
                {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Session Modal ────────────────────────────────────────────────── */}
      {editing && (
        <div
          role="dialog" aria-modal="true" aria-label="Edit Session"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}
        >
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>Edit Session</h2>
              <button onClick={() => setEditing(null)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {editError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{editError}</div>}
              <div className="input-group-3">
                <div className="form-group">
                  <label className="label">Faculty</label>
                  <select className="input" value={editForm.facultyId} onChange={(e) => setEditForm({ ...editForm, facultyId: e.target.value })}>
                    <option value="">— select —</option>
                    {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Batch</label>
                  <select className="input" value={editForm.batchId} onChange={(e) => setEditForm({ ...editForm, batchId: e.target.value })}>
                    <option value="">— select —</option>
                    {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Subject</label>
                  <input className="input" value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Chapter</label>
                  <input className="input" value={editForm.chapter} onChange={(e) => setEditForm({ ...editForm, chapter: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Session Date</label>
                  <input type="date" className="input" value={editForm.sessionDate} max={todayLocal()} onChange={(e) => setEditForm({ ...editForm, sessionDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Duration (hours)</label>
                  <input type="number" className="input" min={0.25} max={12} step={0.25}
                    value={editForm.durationHours}
                    onChange={(e) => setEditForm({ ...editForm, durationHours: +e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sessions table ────────────────────────────────────────────────────── */}
      <div className="card">
        {loading ? (
          <SkeletonTable rows={8} cols={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📅"
            title={sessions.length === 0 ? 'No sessions logged yet' : 'No sessions match your filters'}
            description={sessions.length === 0 ? 'Log the first session to start tracking class history.' : 'Try adjusting the search or filters above.'}
            action={sessions.length === 0 ? { label: '+ New Session', onClick: () => { setShowForm(true); setError('') } } : undefined}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Batch</th>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Hrs</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const bType = getBatchType(s.batchId ?? '', batches)
                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>
                        {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                      </td>
                      <td>
                        {bType && <span className={`badge ${BATCH_TYPE_BADGE[bType] ?? 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>{bType}</span>}
                      </td>
                      <td>{s.subject}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{s.chapter}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.durationHours}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`}>
                          {s.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                          {canEdit && s.status !== 'CANCELLED' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} title="Edit session">✎</button>
                          )}
                          {/* Mark Complete only makes sense for legacy SCHEDULED sessions */}
                          {s.status === 'SCHEDULED' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleMarkComplete(s._id)} disabled={cancelling === s._id} title="Mark Completed">✓</button>
                          )}
                          {/* Cancel is available for any non-cancelled session */}
                          {(s.status === 'SCHEDULED' || s.status === 'COMPLETED' || s.status === 'NOT_COMPLETED') && (
                            <>
                              <select className="input" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: 105 }}
                                value={cancelInitiator[s._id] ?? ''} onChange={(e) => setCancelInitiator({ ...cancelInitiator, [s._id]: e.target.value })}>
                                <option value="">initiator</option>
                                <option value="FACULTY">Faculty</option>
                                <option value="STUDENT">Student</option>
                                <option value="MANAGEMENT">Management</option>
                              </select>
                              <button className="btn btn-danger btn-sm" disabled={cancelling === s._id} onClick={() => handleCancel(s._id)} title="Cancel session">
                                {cancelling === s._id ? '…' : '✕'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
