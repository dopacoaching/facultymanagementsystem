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
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  BatchChapter, EditSessionForm, NewSessionForm, NEET_SUBJECTS, SyllabusChapter,
  SessionFilterBar, NewSessionModal, EditSessionModal, SessionsTable,
} from '@/components/academics/sessions'

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
  const [form, setForm] = useState<NewSessionForm>({
    facultyId: '', batchId: '', subject: '', chapter: '',
    syllabusChapterId: undefined,
    startTime: '',
    durationHours: 1,
    durationMinutes: 0,
    sessionDate: todayLocal(),
    sessionCategory: 'CLASS',
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
  const [editForm, setEditForm]       = useState<EditSessionForm>({ facultyId: '', batchId: '', subject: '', chapter: '', sessionDate: '', durationHours: 1 })
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState('')

  const canEdit = role === 'ADMIN' || role === 'HR_MANAGER' || role === 'ACADEMICS_MANAGER'

  // Derived: is the form's selected batch requiring video-first?
  const formBatchType = getBatchType(form.batchId, batches)
  const needsVideoFirst = formBatchType ? isVideoFirstBatch(formBatchType) : false
  // Derived: does the selected faculty need a Class/Doubt Clearance category picker?
  const selectedFaculty = facultyList.find((f) => f._id === form.facultyId)
  const needsSessionCategory = Boolean(selectedFaculty?.requiresSessionCategory)

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
        sessionCategory:   needsSessionCategory ? form.sessionCategory : undefined,
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

      <SessionFilterBar
        search={search} onSearchChange={setSearch}
        filterBatch={filterBatch} onBatchChange={setFilterBatch} batches={batches}
        statusFilter={statusFilter} onStatusChange={setStatus}
        filterMonth={filterMonth} onMonthChange={setFilterMonth}
        filterYear={filterYear} onYearChange={setFilterYear} years={years}
        onClear={() => { setSearch(''); setStatus('ALL'); setFilterMonth(0); setFilterYear(0); setFilterBatch('') }}
      />

      {showForm && (
        <NewSessionModal
          form={form} setForm={setForm}
          facultyList={facultyList} batches={batches} otherSubjects={otherSubjects}
          needsVideoFirst={needsVideoFirst} formBatchType={formBatchType}
          needsSessionCategory={needsSessionCategory}
          loadingCh={loadingCh} loadingSyllabus={loadingSyllabus}
          syllabusChapters={syllabusChapters} syllabusChaptersByMonth={syllabusChaptersByMonth}
          chapters={chapters}
          error={error} saving={saving}
          onClose={() => { setShowForm(false); setError('') }}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <EditSessionModal
          form={editForm} setForm={setEditForm}
          facultyList={facultyList} batches={batches}
          error={editError} saving={editSaving}
          onClose={() => setEditing(null)}
          onSubmit={handleEditSave}
        />
      )}

      <SessionsTable
        loading={loading}
        filtered={filtered}
        totalCount={sessions.length}
        batches={batches}
        canEdit={canEdit}
        cancelling={cancelling}
        cancelInitiator={cancelInitiator}
        onCancelInitiatorChange={(id, value) => setCancelInitiator((prev) => ({ ...prev, [id]: value }))}
        onEdit={openEdit}
        onMarkComplete={handleMarkComplete}
        onCancel={handleCancel}
        onNewSession={() => { setShowForm(true); setError('') }}
      />
    </div>
  )
}
