'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface ISession {
  _id: string
  facultyId: { _id: string; name: string } | string | null
  batchId: string
  subject: string
  chapter: string
  durationHours: number
  sessionDate: string
  status: string
}

function formatDuration(decimalHours: number): string {
  const h = Math.floor(decimalHours)
  const m = Math.round((decimalHours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:     'badge-blue',
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  NOT_COMPLETED: 'badge-yellow',
}

const STATUS_OPTIONS = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOT_COMPLETED']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface ISBatchChapter {
  _id: string
  subject: string
  chapterName: string
  chapterOrder: number
  status: 'NOT_YET_SCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
}

export default function IGSessionsPage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const isCoordinator = role === 'IG_COORDINATOR' || role === 'COORDINATOR'
  const [sessions, setSessions]       = useState<ISession[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [showForm, setShowForm]       = useState(false)
  const [cancelling, setCancelling]   = useState('')
  const [form, setForm] = useState({
    facultyId:   '',
    batchId:     '',
    subject:     '',
    chapter:     '',
    startTime:   '',
    sessionDate: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving]                     = useState(false)
  const [cancelInitiator, setCancelInitiator]   = useState<Record<string, string>>({})
  const [error, setError]                       = useState('')

  // IG batch chapters for subject + chapter dropdowns
  const [igChapters,   setIgChapters]   = useState<ISBatchChapter[]>([])
  const [loadingIgCh,  setLoadingIgCh]  = useState(false)

  // Filters
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('ALL')
  const [filterMonth, setFilterMonth] = useState(0)   // 0 = all months
  const [filterYear, setFilterYear]   = useState(0)   // 0 = all years

  // Edit modal
  const [editing, setEditing]       = useState<ISession | null>(null)
  const [editForm, setEditForm]     = useState({ facultyId: '', batchId: '', subject: '', chapter: '', sessionDate: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')

  // Managers who can do full edits; coordinators can only change status
  const canEdit = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'IG_ACADEMICS_MANAGER'

  const load = () => {
    if (accessToken)
      apiFetch<ISession[]>('/ig/sessions', { token: accessToken })
        .then(setSessions)
        .catch(console.error)
  }

  useEffect(() => {
    if (!accessToken) return
    load()
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
    getBatches(accessToken).then((list) => {
      const isBatches = list.filter((b) => b.type === 'IG')
      const visible = isCoordinator && coordinatorBatchId
        ? isBatches.filter((b) => b._id === coordinatorBatchId)
        : isBatches
      setBatches(visible)
      if (visible.length) setForm((f) => ({ ...f, batchId: visible[0]._id }))
    }).catch(console.error)
  }, [accessToken])

  // Load ISBatchChapter list when batch changes (drives subject + chapter dropdowns)
  useEffect(() => {
    if (!accessToken || !form.batchId) { setIgChapters([]); return }
    setLoadingIgCh(true)
    apiFetch<ISBatchChapter[]>(`/ig/chapters?batchId=${form.batchId}`, { token: accessToken })
      .then(setIgChapters).catch(console.error).finally(() => setLoadingIgCh(false))
  }, [accessToken, form.batchId])

  // Unique subjects for this batch's chapters
  const igSubjects = useMemo(
    () => [...new Set(igChapters.map((c) => c.subject))].sort(),
    [igChapters],
  )

  // Chapters filtered by selected subject, sorted by order
  const igFilteredChapters = useMemo(
    () => igChapters.filter((c) => c.subject === form.subject).sort((a, b) => a.chapterOrder - b.chapterOrder),
    [igChapters, form.subject],
  )

  // ── Derived filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = sessions
    if (statusFilter !== 'ALL')  list = list.filter((s) => s.status === statusFilter)
    if (filterMonth > 0)         list = list.filter((s) => new Date(s.sessionDate).getMonth() + 1 === filterMonth)
    if (filterYear  > 0)         list = list.filter((s) => new Date(s.sessionDate).getFullYear() === filterYear)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((s) =>
        s.subject.toLowerCase().includes(q) ||
        s.chapter.toLowerCase().includes(q) ||
        (typeof s.facultyId === 'object'
          ? s.facultyId?.name?.toLowerCase().includes(q)
          : String(s.facultyId).includes(q))
      )
    }
    return list
  }, [sessions, statusFilter, filterMonth, filterYear, search])

  // ── Derived years for filter ────────────────────────────────────────────────
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
      await apiFetch('/ig/sessions', {
        token: accessToken,
        method: 'POST',
        body: {
          facultyId:   form.facultyId,
          batchId:     form.batchId,
          subject:     form.subject,
          chapter:     form.chapter,
          startTime:   form.startTime || undefined,
          sessionDate: form.sessionDate,
        },
      })
      toast.success('Session created', 'IG session has been logged successfully.')
      setShowForm(false); load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally { setSaving(false) }
  }

  async function handleMarkComplete(id: string) {
    if (!accessToken) return
    try {
      await apiFetch(`/ig/sessions/${id}/status`, {
        method: 'PATCH',
        body: { status: 'COMPLETED' },
        token: accessToken,
      })
      load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to mark session complete') }
  }

  async function handleCancel(id: string) {
    if (!accessToken) return
    const initiator = cancelInitiator[id]
    if (!initiator) { setError('Select a cancellation initiator before cancelling.'); return }
    setCancelling(id)
    try {
      await apiFetch('/ig/sessions/cancel', {
        method: 'POST',
        body: { sessionId: id, cancellationInitiator: initiator },
        token: accessToken,
      })
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Cancel failed')
    } finally { setCancelling('') }
  }

  function openEdit(s: ISession) {
    setEditing(s)
    setEditForm({
      facultyId:   typeof s.facultyId === 'object' ? (s.facultyId?._id ?? '') : (s.facultyId ?? ''),
      batchId:     s.batchId ?? '',
      subject:     s.subject,
      chapter:     s.chapter,
      sessionDate: s.sessionDate.slice(0, 10),
    })
    setEditError('')
  }

  async function handleEditSave() {
    if (!accessToken || !editing) return
    setEditSaving(true); setEditError('')
    try {
      await apiFetch(`/ig/sessions/${editing._id}`, {
        method: 'PATCH',
        body: {
          facultyId:   editForm.facultyId,
          batchId:     editForm.batchId,
          subject:     editForm.subject,
          chapter:     editForm.chapter,
          sessionDate: editForm.sessionDate,
        },
        token: accessToken,
      })
      setEditing(null); load()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Edit failed')
    } finally { setEditSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>IG Sessions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {filtered.length} of {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setError('') }}>+ New Session</button>
      </div>

      {error && !showForm && !editing && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={() => setError('')} />
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }}>🔍</span>
            <input className="input" placeholder="Search faculty, subject, chapter…" value={search}
              onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
          </div>
          <div>
            <select className="input" value={statusFilter} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 140 }}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <select className="input" value={filterMonth} onChange={(e) => setFilterMonth(+e.target.value)} style={{ minWidth: 110 }}>
              <option value={0}>All Months</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <select className="input" value={filterYear} onChange={(e) => setFilterYear(+e.target.value)} style={{ minWidth: 100 }}>
              <option value={0}>All Years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {(search || statusFilter !== 'ALL' || filterMonth > 0 || filterYear > 0) && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setStatus('ALL'); setFilterMonth(0); setFilterYear(0) }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── New Session Modal ──────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>Log IG Session</h2>
              <button onClick={() => { setShowForm(false); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} /></div>}
              <div className="input-group-3">
                <div className="form-group">
                  <label className="label">Faculty</label>
                  <select className="input" value={form.facultyId}
                    onChange={(e) => {
                      const fac = facultyList.find((f) => f._id === e.target.value)
                      setForm((f) => {
                        const newSubject = fac?.subject ?? f.subject
                        return { ...f, facultyId: e.target.value, subject: newSubject, chapter: newSubject !== f.subject ? '' : f.chapter }
                      })
                    }}>
                    <option value="">— select —</option>
                    {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">IG Batch</label>
                  <select className="input" value={form.batchId}
                    onChange={(e) => setForm({ ...form, batchId: e.target.value, subject: '', chapter: '' })}
                    disabled={isCoordinator}>
                    <option value="">— select —</option>
                    {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Subject</label>
                  {loadingIgCh ? (
                    <div className="input" style={{ color: 'var(--color-muted)' }}>Loading…</div>
                  ) : igSubjects.length > 0 ? (
                    <select className="input" value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value, chapter: '' })}>
                      <option value="">— select subject —</option>
                      {igSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value, chapter: '' })}
                      placeholder="e.g. Physics" />
                  )}
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Chapter</label>
                  {loadingIgCh ? (
                    <div className="input" style={{ color: 'var(--color-muted)' }}>Loading chapters…</div>
                  ) : igFilteredChapters.length > 0 ? (
                    <select className="input" value={form.chapter}
                      onChange={(e) => setForm({ ...form, chapter: e.target.value })}>
                      <option value="">— select chapter —</option>
                      {igFilteredChapters.map((ch) => {
                        const done      = ch.status === 'COMPLETED'
                        const cancelled = ch.status === 'CANCELLED'
                        const suffix    = done ? ' ✓' : cancelled ? ' ✗' : ''
                        return (
                          <option key={ch._id} value={ch.chapterName} disabled={cancelled}>
                            {ch.chapterName}{suffix}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <input className="input" value={form.chapter}
                      onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                      placeholder={form.subject ? 'Enter chapter or topic' : 'Select a subject first'} />
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Session Date</label>
                  <input type="date" className="input" value={form.sessionDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
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
              <h2 style={{ fontWeight: 700, margin: 0 }}>Edit IG Session</h2>
              <button onClick={() => setEditing(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {editError && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={editError} /></div>}
              <div className="input-group-3">
                <div className="form-group">
                  <label className="label">Faculty</label>
                  <select className="input" value={editForm.facultyId} onChange={(e) => setEditForm({ ...editForm, facultyId: e.target.value })}>
                    <option value="">— select —</option>
                    {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">IG Batch</label>
                  <select className="input" value={editForm.batchId} onChange={(e) => setEditForm({ ...editForm, batchId: e.target.value })}>
                    <option value="">— select —</option>
                    {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Subject</label>
                  <input className="input" value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Chapter</label>
                  <input className="input" value={editForm.chapter}
                    onChange={(e) => setEditForm({ ...editForm, chapter: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Session Date</label>
                  <input type="date" className="input" value={editForm.sessionDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setEditForm({ ...editForm, sessionDate: e.target.value })} />
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
          <EmptyState
            icon="🏫"
            title={sessions.length === 0 ? 'No IG sessions yet' : 'No sessions match your filters'}
            description={sessions.length === 0 ? 'Click "+ New Session" above to log the first IG class.' : 'Try adjusting the search term or status filter.'}
            action={sessions.length === 0 ? { label: '+ New Session', onClick: () => setShowForm(true) } : undefined}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Duration</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>
                      {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                    </td>
                    <td>{s.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{s.chapter}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDuration(s.durationHours)}</td>
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
                        {s.status === 'SCHEDULED' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleMarkComplete(s._id)}
                            disabled={cancelling === s._id} title="Mark Completed">✓</button>
                        )}
                        {(s.status === 'SCHEDULED' || s.status === 'NOT_COMPLETED') && (
                          <>
                            <select className="input" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: 105 }}
                              value={cancelInitiator[s._id] ?? ''}
                              onChange={(e) => setCancelInitiator({ ...cancelInitiator, [s._id]: e.target.value })}>
                              <option value="">initiator</option>
                              <option value="FACULTY">Faculty</option>
                              <option value="STUDENT">Student</option>
                              <option value="MANAGEMENT">Management</option>
                            </select>
                            <button className="btn btn-danger btn-sm" disabled={cancelling === s._id}
                              onClick={() => handleCancel(s._id)} title="Cancel Session">
                              {cancelling === s._id ? '…' : '✕'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
