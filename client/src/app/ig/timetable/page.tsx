'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches, getAll as getFaculty } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { Skeleton, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type IGSessionSlot = 'SESSION_1' | 'SESSION_2' | 'SESSION_3'
type IGSessionType = 'LIVE_SESSION' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

interface Slot {
  _id:         string
  date:        string
  campusId:    { _id: string; name: string } | string
  batchId:     { _id: string; name: string; type: string; ig1Subgroup?: string } | string
  facultyId?:  { _id: string; name: string } | string
  subject:     string
  chapter:     string
  timeSlot:    IGSessionSlot
  sessionType: IGSessionType
  /** Planned duration in hours */
  durationHours?: number
  startTime?:  string
  status:      'PLANNED' | 'COMPLETED' | 'CANCELLED'
  notes?:      string
  isUnplanned: boolean
}

interface SpecialDay {
  _id:      string
  date:     string
  campusId?: { _id: string; name: string } | null
  type:     string
  notes?:   string
}

interface DailyResponse {
  slots:       Slot[]
  specialDays: SpecialDay[]
  date:        string
}

interface ISChapter {
  _id:          string
  batchId:      string
  subject:      string
  chapterName:  string
  chapterOrder: number
  status:       string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIAL_DAY_TYPES = ['MONDAY_EXAM', 'FRIDAY_EXAM', 'WEEKLY_EXAM', 'TOUR', 'BUFFER_DAY', 'HOLIDAY']

const SESSION_SLOTS: { value: IGSessionSlot; label: string }[] = [
  { value: 'SESSION_1', label: 'Session 1' },
  { value: 'SESSION_2', label: 'Session 2' },
  { value: 'SESSION_3', label: 'Session 3' },
]

const SESSION_TYPES: { value: IGSessionType; label: string }[] = [
  { value: 'LIVE_SESSION',  label: '🎓 Live Session' },
  { value: 'WEEKLY_EXAM',   label: '📝 Weekly Exam (Mon / Fri)' },
  { value: 'MONTHLY_EXAM',  label: '📋 Monthly Exam' },
]

const SESSION_TYPE_BADGE: Record<IGSessionType, string> = {
  LIVE_SESSION:  'badge-blue',
  WEEKLY_EXAM:   'badge-indigo',
  MONTHLY_EXAM:  'badge-purple',
}

const SESSION_TYPE_LABEL: Record<IGSessionType, string> = {
  LIVE_SESSION:  'Live',
  WEEKLY_EXAM:   'Weekly Exam',
  MONTHLY_EXAM:  'Monthly Exam',
}

const SLOT_STATUS_BADGE: Record<string, string> = {
  PLANNED:   'badge-blue',
  COMPLETED: 'badge-green',
  CANCELLED: 'badge-red',
}

const SPECIAL_TYPE_BADGE: Record<string, string> = {
  MONDAY_EXAM: 'badge-indigo',
  FRIDAY_EXAM: 'badge-indigo',
  WEEKLY_EXAM: 'badge-purple',
  TOUR:        'badge-yellow',
  BUFFER_DAY:  'badge-gray',
  HOLIDAY:     'badge-red',
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ISTimetablePage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const [selectedDate,   setSelectedDate]   = useState(today())
  const [filterCampusId, setFilterCampusId] = useState('')
  const [daily,          setDaily]          = useState<DailyResponse | null>(null)
  const [loading,        setLoading]        = useState(false)

  const [batches,      setBatches]      = useState<Batch[]>([])
  const [facultyList,  setFacultyList]  = useState<Faculty[]>([])
  const [chapters,     setChapters]     = useState<ISChapter[]>([])
  const [showAssign,   setShowAssign]   = useState(false)
  const [showSpecial,  setShowSpecial]  = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  // IS campuses derived from batches
  const campuses = useMemo(() => {
    const seen = new Map<string, string>()
    for (const b of batches) {
      if (b.type === 'IG' && b.campusId) {
        const id   = typeof b.campusId === 'object' ? (b.campusId as { _id: string; name: string })._id : b.campusId
        const name = typeof b.campusId === 'object' ? (b.campusId as { _id: string; name: string }).name : id
        if (!seen.has(id)) seen.set(id, name)
      }
    }
    return Array.from(seen, ([_id, name]) => ({ _id, name }))
  }, [batches])

  // Assign form
  const [form, setForm] = useState({
    batchId:         '',
    campusId:        '',
    facultyId:       '',
    subject:         '',
    chapter:         '',
    examTopic:       '',
    startTime:       '',
    timeSlot:        'SESSION_1' as IGSessionSlot,
    sessionType:     'LIVE_SESSION' as IGSessionType,
    durationHours:   '' as string | number,
    durationMinutes: 0,
    notes:           '',
    isUnplanned:     false,
  })

  // Special day form
  const [specialForm, setSpecialForm] = useState({
    type:     'BUFFER_DAY',
    campusId: '',
    notes:    '',
  })

  const canManage  = ['ADMIN', 'IG_ACADEMICS_MANAGER', 'ACADEMICS_MANAGER', 'HR_MANAGER'].includes(role ?? '')
  const canDelete  = ['ADMIN', 'IG_ACADEMICS_MANAGER'].includes(role ?? '')
  const isIsBatches = useMemo(() => batches.filter((b) => b.type === 'IG'), [batches])

  // ── Load reference data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then((list) => {
      setBatches(list)
      const isb = list.filter((b) => b.type === 'IG')
      if (isb.length) {
        const first = isb[0]
        const campId = typeof first.campusId === 'object'
          ? (first.campusId as { _id: string })._id
          : (first.campusId as string)
        setForm((f) => ({ ...f, batchId: first._id, campusId: campId }))
      }
    }).catch(console.error)
    getFaculty(accessToken).then(setFacultyList).catch(console.error)
  }, [accessToken])

  // ── Load daily timetable ────────────────────────────────────────────────────
  const loadDaily = () => {
    if (!accessToken) return
    setLoading(true)
    const params = new URLSearchParams({ date: selectedDate })
    if (filterCampusId) params.set('campusId', filterCampusId)
    apiFetch<DailyResponse>(`/ig/timetable/daily?${params}`, { token: accessToken })
      .then(setDaily)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadDaily() }, [accessToken, selectedDate, filterCampusId]) // eslint-disable-line

  // ── Load all NOT_YET_SCHEDULED chapters for the selected batch ──────────────
  // Loading all subjects at once lets the subject dropdown show every option
  // (PHYSICS, CHEMISTRY, BIOLOGY, MATHS, ENGLISH, MALAYALAM) without needing
  // to know the subject first.
  useEffect(() => {
    if (!accessToken || !form.batchId) { setChapters([]); return }
    apiFetch<ISChapter[]>(
      `/ig/chapters?batchId=${form.batchId}`,
      { token: accessToken }
    ).then(setChapters).catch(() => setChapters([]))
  }, [accessToken, form.batchId])

  // Auto-populate campusId when batch changes
  useEffect(() => {
    if (!form.batchId) return
    const batch = isIsBatches.find((b) => b._id === form.batchId)
    if (!batch) return
    const campId = typeof batch.campusId === 'object'
      ? (batch.campusId as { _id: string })._id
      : (batch.campusId as string)
    setForm((f) => ({ ...f, campusId: campId }))
  }, [form.batchId, isIsBatches])

  // ── Assign slot ─────────────────────────────────────────────────────────────
  async function handleAssign() {
    if (!accessToken) return
    const isExam = form.sessionType === 'WEEKLY_EXAM' || form.sessionType === 'MONTHLY_EXAM'
    if (!form.batchId || !form.timeSlot) {
      setError('Batch and session slot are required'); return
    }
    if (!isExam && (!form.subject || !form.chapter)) {
      setError('Subject and chapter are required for live sessions'); return
    }
    if (isExam && !form.subject) {
      setError('Subject is required for exams'); return
    }
    const totalDuration = (form.durationHours !== '' ? Number(form.durationHours) : 0) + form.durationMinutes / 60
    if (totalDuration > 0 && totalDuration < 0.25) {
      setError('Duration must be at least 15 minutes'); return
    }
    // Derive campusId directly from the selected batch at submit time to avoid
    // a one-render lag when the batch changes and the auto-populate effect hasn't fired yet.
    const selectedBatch = isIsBatches.find((b) => b._id === form.batchId)
    const campusId = selectedBatch
      ? (typeof selectedBatch.campusId === 'object'
          ? (selectedBatch.campusId as { _id: string })._id
          : selectedBatch.campusId as string)
      : form.campusId
    if (!campusId) {
      setError('Campus could not be determined for the selected batch'); return
    }
    setSaving(true); setError('')
    try {
      await apiFetch('/ig/timetable/assign', {
        token: accessToken,
        method: 'POST',
        body: {
          batchId:       form.batchId,
          campusId,
          facultyId:     form.facultyId || undefined,
          subject:       form.subject,
          // For exams the examTopic is stored in the chapter field
          chapter:       isExam ? (form.examTopic || form.subject + ' Exam') : form.chapter,
          timeSlot:      form.timeSlot,
          sessionType:   form.sessionType,
          notes:         form.notes || undefined,
          isUnplanned:   form.isUnplanned,
          date:          selectedDate,
          startTime:     form.startTime || undefined,
          durationHours: form.durationHours !== ''
            ? Number(form.durationHours) + form.durationMinutes / 60
            : undefined,
        },
      })
      toast.success('Class assigned', 'Timetable slot has been created.')
      setShowAssign(false)
      setForm((f) => ({ ...f, subject: '', chapter: '', examTopic: '', notes: '', facultyId: '', startTime: '', durationHours: '', durationMinutes: 0, sessionType: 'LIVE_SESSION' }))
      loadDaily()
    } catch (e: unknown) {
      const err = e as { violations?: string[] }
      if (err.violations?.length) {
        setError('Conflict: ' + err.violations.join(' | '))
      } else {
        setError(e instanceof Error ? e.message : 'Assign failed')
      }
    } finally { setSaving(false) }
  }

  // ── Update slot status ──────────────────────────────────────────────────────
  async function handleStatus(id: string, status: 'COMPLETED' | 'CANCELLED') {
    if (!accessToken) return
    if (!confirm(`Mark this slot as ${status}?`)) return
    try {
      await apiFetch(`/ig/timetable/${id}`, {
        method: 'PATCH', token: accessToken, body: { status },
      })
      loadDaily()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Update failed') }
  }

  // ── Delete slot ─────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!accessToken) return
    if (!confirm('Delete this planned slot?')) return
    try {
      await apiFetch(`/ig/timetable/${id}`, { method: 'DELETE', token: accessToken })
      loadDaily()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Delete failed') }
  }

  // ── Add special day ─────────────────────────────────────────────────────────
  async function handleAddSpecialDay() {
    if (!accessToken) return
    setSaving(true); setError('')
    try {
      await apiFetch('/ig/special-days', {
        method: 'POST', token: accessToken,
        body: { ...specialForm, date: selectedDate },
      })
      setShowSpecial(false)
      setSpecialForm({ type: 'BUFFER_DAY', campusId: '', notes: '' })
      loadDaily()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add special day')
    } finally { setSaving(false) }
  }

  async function handleDeleteSpecialDay(id: string) {
    if (!accessToken) return
    if (!confirm('Remove this special day?')) return
    try {
      await apiFetch(`/ig/special-days/${id}`, { method: 'DELETE', token: accessToken })
      loadDaily()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Delete failed') }
  }

  // ── Group slots by session number ───────────────────────────────────────────
  const session1Slots = daily?.slots.filter((s) => s.timeSlot === 'SESSION_1') ?? []
  const session2Slots = daily?.slots.filter((s) => s.timeSlot === 'SESSION_2') ?? []
  const session3Slots = daily?.slots.filter((s) => s.timeSlot === 'SESSION_3') ?? []
  // Legacy support for old MORNING/AFTERNOON data
  const morningSlots   = daily?.slots.filter((s) => (s.timeSlot as string) === 'MORNING')   ?? []
  const afternoonSlots = daily?.slots.filter((s) => (s.timeSlot as string) === 'AFTERNOON') ?? []

  const getBatchName = (bid: Slot['batchId']) =>
    typeof bid === 'object' ? bid.name : (isIsBatches.find((b) => b._id === bid)?.name ?? String(bid).slice(-6))
  const getFacultyName = (fid: Slot['facultyId']) =>
    typeof fid === 'object' ? (fid?.name ?? '—') : '—'

  // Available subjects from chapters (unique)
  const availableSubjects = useMemo(() => {
    if (!form.batchId) return []
    const sub = new Set(chapters.map((c) => c.subject))
    return Array.from(sub)
  }, [chapters, form.batchId])

  // Chapters for chosen subject — only those not yet scheduled
  const availableChapters = useMemo(
    () => chapters.filter((c) => c.subject === form.subject && c.status === 'NOT_YET_SCHEDULED').sort((a, b) => a.chapterOrder - b.chapterOrder),
    [chapters, form.subject]
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>IG Daily Timetable</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {fmtDate(selectedDate)}
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => { setShowSpecial(true); setError('') }}>＋ Special Day</button>
            <button className="btn btn-primary" onClick={() => { setShowAssign(true); setError('') }}>＋ Assign Class</button>
          </div>
        )}
      </div>

      {error && !showAssign && !showSpecial && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={() => setError('')} />
        </div>
      )}

      {/* ── Date + campus filter bar ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '0.875rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" style={{ marginBottom: '0.25rem' }}>Date</label>
            <input type="date" className="input" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)} style={{ minWidth: 160 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" style={{ marginBottom: '0.25rem' }}>Campus</label>
            <select className="input" value={filterCampusId} onChange={(e) => setFilterCampusId(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">All IG Campuses</option>
              {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().slice(0, 10)) }}>‹ Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(today())}>Today</button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().slice(0, 10)) }}>Next ›</button>
          </div>
        </div>
      </div>

      {/* ── Special days banner ─────────────────────────────────────────────── */}
      {(daily?.specialDays?.length ?? 0) > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {daily!.specialDays.map((sd) => (
            <div key={sd._id} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '0.5rem', padding: '0.5rem 0.875rem',
            }}>
              <span className={`badge ${SPECIAL_TYPE_BADGE[sd.type] ?? 'badge-gray'}`}>{sd.type.replace(/_/g, ' ')}</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                {typeof sd.campusId === 'object' && sd.campusId ? sd.campusId.name : 'All IG Campuses'}
                {sd.notes ? ` — ${sd.notes}` : ''}
              </span>
              {canDelete && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', lineHeight: 1 }}
                  onClick={() => handleDeleteSpecialDay(sd._id)}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Timetable grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          {[1,2,3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
              <Skeleton height="1rem" width={80} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Skeleton height="1rem" width="50%" />
                <Skeleton height="0.875rem" width="35%" />
              </div>
              <Skeleton height="1.5rem" width={80} radius="999px" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {[
            { label: 'Session 1', slots: [...session1Slots, ...morningSlots] },
            { label: 'Session 2', slots: session2Slots },
            { label: 'Session 3', slots: [...session3Slots, ...afternoonSlots] },
          ].map(({ label, slots }) => (
            <div key={label} className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: 'var(--color-primary)' }}>{label}</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{slots.length} class{slots.length !== 1 ? 'es' : ''}</span>
              </div>
              {slots.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>No session assigned</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Type</th>
                        <th>Subject</th>
                        <th>Chapter / Topic</th>
                        <th>Faculty</th>
                        <th>Planned</th>
                        <th>Status</th>
                        {canManage && <th style={{ width: 140 }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot) => (
                        <tr key={slot._id}>
                          <td style={{ fontWeight: 600 }}>
                            {getBatchName(slot.batchId)}
                            {slot.isUnplanned && (
                              <span className="badge badge-yellow" style={{ marginLeft: '0.375rem', fontSize: '0.65rem' }}>unplanned</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${SESSION_TYPE_BADGE[slot.sessionType] ?? 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                              {SESSION_TYPE_LABEL[slot.sessionType] ?? slot.sessionType ?? 'Live'}
                            </span>
                          </td>
                          <td>{slot.subject}</td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {slot.chapter}
                          </td>
                          <td>{getFacultyName(slot.facultyId)}</td>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
                            {slot.durationHours ? `${slot.durationHours}h` : '—'}
                          </td>
                          <td>
                            <span className={`badge ${SLOT_STATUS_BADGE[slot.status] ?? 'badge-gray'}`}>
                              {slot.status}
                            </span>
                          </td>
                          {canManage && (
                            <td>
                              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'nowrap' }}>
                                {slot.status === 'PLANNED' && (
                                  <>
                                    <button className="btn btn-success btn-sm" title="Mark Completed"
                                      onClick={() => handleStatus(slot._id, 'COMPLETED')}>✓</button>
                                    <button className="btn btn-danger btn-sm" title="Cancel"
                                      onClick={() => handleStatus(slot._id, 'CANCELLED')}>✕</button>
                                    {canDelete && (
                                      <button className="btn btn-ghost btn-sm" title="Delete"
                                        onClick={() => handleDelete(slot._id)}>🗑</button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {session1Slots.length === 0 && session2Slots.length === 0 && session3Slots.length === 0 && morningSlots.length === 0 && afternoonSlots.length === 0 && (
            <div className="card">
              <EmptyState
                icon="🏫"
                title="No classes scheduled for this day"
                description={canManage ? 'No timetable entries for the selected date. Click "Assign Class" to plan a class.' : 'No timetable entries for the selected date.'}
              />
            </div>
          )}
        </>
      )}

      {/* ── Assign Class Modal ──────────────────────────────────────────────── */}
      {showAssign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 600, border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontWeight: 700, margin: 0 }}>Assign IG Class</h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(selectedDate)}</p>
              </div>
              <button onClick={() => { setShowAssign(false); setError(''); setForm((f) => ({ ...f, subject: '', chapter: '', examTopic: '', notes: '', facultyId: '', startTime: '', durationHours: '', durationMinutes: 0, sessionType: 'LIVE_SESSION' })) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} /></div>}
              <div className="input-group">
                <div className="form-group">
                  <label className="label">IG Batch</label>
                  <select className="input" value={form.batchId}
                    onChange={(e) => setForm({ ...form, batchId: e.target.value, subject: '', chapter: '' })}>
                    <option value="">— select —</option>
                    {isIsBatches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Session Slot</label>
                  <select className="input" value={form.timeSlot}
                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value as IGSessionSlot })}>
                    {SESSION_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Session Type</label>
                  <select className="input" value={form.sessionType}
                    onChange={(e) => setForm({ ...form, sessionType: e.target.value as IGSessionType, chapter: '', examTopic: '' })}>
                    {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Subject</label>
                  {availableSubjects.length > 0 ? (
                    <select className="input" value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value, chapter: '', examTopic: '' })}>
                      <option value="">— select subject —</option>
                      {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form.subject} placeholder="e.g. Physics"
                      onChange={(e) => setForm({ ...form, subject: e.target.value, chapter: '', examTopic: '' })} />
                  )}
                </div>
                {/* Chapter — only for live sessions */}
                {(form.sessionType === 'LIVE_SESSION') && (
                  <div className="form-group">
                    <label className="label">Chapter</label>
                    {availableChapters.length > 0 ? (
                      <select className="input" value={form.chapter}
                        onChange={(e) => setForm({ ...form, chapter: e.target.value })}>
                        <option value="">— select chapter —</option>
                        {availableChapters.map((c) => <option key={c._id} value={c.chapterName}>{c.chapterName}</option>)}
                      </select>
                    ) : (
                      <input className="input" value={form.chapter} placeholder="Chapter name"
                        onChange={(e) => setForm({ ...form, chapter: e.target.value })} />
                    )}
                  </div>
                )}
                {/* Exam topic — for exams */}
                {(form.sessionType === 'WEEKLY_EXAM' || form.sessionType === 'MONTHLY_EXAM') && (
                  <div className="form-group">
                    <label className="label">Exam Topic (optional)</label>
                    <input className="input" value={form.examTopic}
                      placeholder={`e.g. ${form.subject || 'Physics'} — Chapters 1–3`}
                      onChange={(e) => setForm({ ...form, examTopic: e.target.value })} />
                  </div>
                )}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Faculty (optional)</label>
                  <select className="input" value={form.facultyId}
                    onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
                    <option value="">— unassigned —</option>
                    {facultyList.map((f) => <option key={f._id} value={f._id}>{f.name} ({f.subject})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Planned Duration</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" className="input" min={0} max={12} step={1}
                      style={{ width: '5rem' }} placeholder="hrs"
                      value={form.durationHours}
                      onChange={(e) => setForm({ ...form, durationHours: e.target.value })} />
                    <select className="input" style={{ width: '5rem' }}
                      value={form.durationMinutes}
                      onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })}>
                      {[0,5,10,15,20,25,30,35,40,45,50,55].map((m) => (
                        <option key={m} value={m}>{m}m</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Notes (optional)</label>
                  <input className="input" value={form.notes} placeholder="Any notes…"
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="isUnplanned" checked={form.isUnplanned}
                    onChange={(e) => setForm({ ...form, isUnplanned: e.target.checked })} />
                  <label htmlFor="isUnplanned" className="label" style={{ margin: 0 }}>
                    Mark as unplanned (logged after-the-fact)
                  </label>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => { setShowAssign(false); setError(''); setForm((f) => ({ ...f, subject: '', chapter: '', examTopic: '', notes: '', facultyId: '', startTime: '', durationHours: '', durationMinutes: 0, sessionType: 'LIVE_SESSION' })) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={saving}>
                {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Assign Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Special Day Modal ───────────────────────────────────────────────── */}
      {showSpecial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 460, border: '1px solid var(--color-border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontWeight: 700, margin: 0 }}>Add Special Day</h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(selectedDate)}</p>
              </div>
              <button onClick={() => { setShowSpecial(false); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {error && <div style={{ marginBottom: '0.75rem' }}><ErrorAlert message={error} /></div>}
              <div className="form-group">
                <label className="label">Type</label>
                <select className="input" value={specialForm.type}
                  onChange={(e) => setSpecialForm({ ...specialForm, type: e.target.value })}>
                  {SPECIAL_DAY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Campus (leave blank for All IG Campuses)</label>
                <select className="input" value={specialForm.campusId}
                  onChange={(e) => setSpecialForm({ ...specialForm, campusId: e.target.value })}>
                  <option value="">All IG Campuses</option>
                  {campuses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Notes (optional)</label>
                <input className="input" value={specialForm.notes} placeholder="e.g. Monthly test"
                  onChange={(e) => setSpecialForm({ ...specialForm, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => { setShowSpecial(false); setError('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddSpecialDay} disabled={saving}>
                {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
