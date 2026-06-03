'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, create, cancel } from '@/services/session.service'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Session, Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:     'badge-blue',
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  NOT_COMPLETED: 'badge-yellow',
}

const STATUS_OPTIONS = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOT_COMPLETED']

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

interface BatchChapter {
  _id: string
  subject: string
  chapterName: string
  syllabusChapterId?: string
  videoComplete: boolean
  facultyClassDone: boolean
}

function getBatchType(batchId: string, batches: Batch[]): string {
  return batches.find((b) => b._id === batchId)?.type ?? ''
}

export default function SessionsPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const [sessions, setSessions]       = useState<Session[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [showForm, setShowForm]       = useState(false)
  const [cancelling, setCancelling]   = useState('')
  const [form, setForm] = useState({
    facultyId: '', batchId: '', subject: '', chapter: '',
    syllabusChapterId: undefined as string | undefined,
    startTime: '',
    durationHours: 1, durationMinutes: 0,
    sessionDate: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving]           = useState(false)
  const [cancelInitiator, setCancelInitiator] = useState<Record<string, string>>({})
  const [error, setError]             = useState('')

  // Chapter loading (video-first batches)
  const [chapters, setChapters]       = useState<BatchChapter[]>([])
  const [loadingCh, setLoadingCh]     = useState(false)

  // Filters
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('ALL')
  const [filterMonth, setFilterMonth] = useState(0)
  const [filterYear, setFilterYear]   = useState(0)
  const [filterBatch, setFilterBatch] = useState('')

  // Edit modal
  const [editing, setEditing]         = useState<Session | null>(null)
  const [editForm, setEditForm]       = useState({ facultyId: '', batchId: '', subject: '', chapter: '', durationHours: 1, sessionDate: '' })
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState('')

  const canEdit = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'ACADEMICS_MANAGER'

  // Derived: is the form's selected batch requiring video-first?
  const formBatchType = getBatchType(form.batchId, batches)
  const needsVideoFirst = formBatchType ? isVideoFirstBatch(formBatchType) : false

  const load = () => {
    if (accessToken) getAll({}, accessToken).then(setSessions).catch(console.error)
  }

  useEffect(() => {
    if (!accessToken) return
    load()
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
    getBatches(accessToken).then((list) => {
      const acBatches = list.filter((b) => b.type !== 'IG')
      setBatches(acBatches)
      if (acBatches.length) setForm((f) => ({ ...f, batchId: acBatches[0]._id }))
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Load chapters when batch / subject changes for video-first batches
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

  const chapterSubjects = useMemo(() => [...new Set(chapters.map((c) => c.subject))].sort(), [chapters])
  const availableChapters = useMemo(() =>
    chapters.filter((c) => c.subject === form.subject && c.videoComplete && !c.facultyClassDone),
    [chapters, form.subject])

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
    setSaving(true); setError('')
    try {
      await create({
        ...form,
        startTime:         form.startTime || undefined,
        durationHours:     form.durationHours + form.durationMinutes / 60,
        syllabusChapterId: form.syllabusChapterId ?? undefined,
      }, accessToken)
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
      durationHours: s.durationHours,
      sessionDate:   s.sessionDate.slice(0, 10),
    })
    setEditError('')
  }

  async function handleEditSave() {
    if (!accessToken || !editing) return
    setEditSaving(true); setEditError('')
    try {
      await apiFetch(`/academics/sessions/${editing._id}`, {
        method: 'PATCH',
        body: { ...editForm, durationHours: Number(editForm.durationHours) },
        token: accessToken,
      })
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
        <div className="alert alert-error" style={{ marginBottom: '1rem' }} onClick={() => setError('')}>
          <span className="alert-icon">⚠</span>{error}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 620, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>Log New Session</h2>
              <button onClick={() => { setShowForm(false); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
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
                  <select className="input" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
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
                  {needsVideoFirst && chapterSubjects.length > 0 ? (
                    <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value, chapter: '', syllabusChapterId: undefined })}>
                      <option value="">— select —</option>
                      {chapterSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Chemistry" />
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Chapter</label>
                  {needsVideoFirst ? (
                    loadingCh ? (
                      <div className="input" style={{ color: 'var(--color-muted)' }}>Loading…</div>
                    ) : availableChapters.length > 0 ? (
                      <select
                        className="input"
                        value={form.chapter}
                        onChange={(e) => {
                          const ch = availableChapters.find((c) => c.chapterName === e.target.value)
                          setForm({ ...form, chapter: e.target.value, syllabusChapterId: ch?.syllabusChapterId ?? undefined })
                        }}
                      >
                        <option value="">— select —</option>
                        {availableChapters.map((c) => <option key={c._id} value={c.chapterName}>{c.chapterName}</option>)}
                      </select>
                    ) : (
                      <div style={{ padding: '0.6rem 0.875rem', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-danger)' }}>
                        {form.subject ? 'No video-complete chapters for this subject' : 'Select a subject first'}
                      </div>
                    )
                  ) : (
                    <input className="input" value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="Chapter name or topic" />
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Duration</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" className="input" min={0} max={12} step={1} style={{ width: '5rem' }} placeholder="hrs"
                      value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: +e.target.value })} />
                    <select className="input" style={{ width: '5rem' }} value={form.durationMinutes}
                      onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value, syllabusChapterId: form.syllabusChapterId })}>
                      {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}m</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Session Date</label>
                  <input type="date" className="input" value={form.sessionDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} />
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>Edit Session</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
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
                  <label className="label">Duration (hrs)</label>
                  <input type="number" className="input" min={0.5} step={0.5} value={editForm.durationHours} onChange={(e) => setEditForm({ ...editForm, durationHours: +e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Session Date</label>
                  <input type="date" className="input" value={editForm.sessionDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setEditForm({ ...editForm, sessionDate: e.target.value })} />
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
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>{sessions.length === 0 ? 'No sessions logged yet' : 'No sessions match your filters'}</h3>
            <p>{sessions.length === 0 ? 'Click "New Session" to log a class' : 'Try adjusting the search or filters'}</p>
          </div>
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
