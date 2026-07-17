'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  EditIGSessionForm, ISBatchChapter, ISession, NewIGSessionForm,
  IGSessionFilterBar, NewIGSessionModal, EditIGSessionModal, IGSessionsTable,
} from '@/components/integrated-school/sessions'

export default function IGSessionsPage() {
  const { accessToken, role, batchId: coordinatorBatchId } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const isCoordinator = role === 'IG_COORDINATOR' || role === 'COORDINATOR'
  const [sessions, setSessions]       = useState<ISession[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [batches, setBatches]         = useState<Batch[]>([])
  const [showForm, setShowForm]       = useState(false)
  const [cancelling, setCancelling]   = useState('')
  const [form, setForm] = useState<NewIGSessionForm>({
    facultyId:     '',
    batchId:       '',
    subject:       '',
    chapter:       '',
    startTime:     '',
    durationHours: '',
    sessionDate:   todayLocal(),
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
  const [editForm, setEditForm]     = useState<EditIGSessionForm>({ facultyId: '', batchId: '', subject: '', chapter: '', sessionDate: '' })
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
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

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
          facultyId:     form.facultyId,
          batchId:       form.batchId,
          subject:       form.subject,
          chapter:       form.chapter,
          startTime:     form.startTime || undefined,
          durationHours: form.durationHours ? Number(form.durationHours) : undefined,
          sessionDate:   form.sessionDate,
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

      <IGSessionFilterBar
        search={search} onSearchChange={setSearch}
        statusFilter={statusFilter} onStatusChange={setStatus}
        filterMonth={filterMonth} onMonthChange={setFilterMonth}
        filterYear={filterYear} onYearChange={setFilterYear} years={years}
        onClear={() => { setSearch(''); setStatus('ALL'); setFilterMonth(0); setFilterYear(0) }}
      />

      {showForm && (
        <NewIGSessionModal
          form={form} setForm={setForm}
          facultyList={facultyList} batches={batches} isCoordinator={isCoordinator}
          loadingIgCh={loadingIgCh} igSubjects={igSubjects} igFilteredChapters={igFilteredChapters}
          error={error} saving={saving}
          onClose={() => { setShowForm(false); setError('') }}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <EditIGSessionModal
          form={editForm} setForm={setEditForm}
          facultyList={facultyList} batches={batches}
          error={editError} saving={editSaving}
          onClose={() => setEditing(null)}
          onSubmit={handleEditSave}
        />
      )}

      <IGSessionsTable
        filtered={filtered}
        totalCount={sessions.length}
        canEdit={canEdit}
        cancelling={cancelling}
        cancelInitiator={cancelInitiator}
        onCancelInitiatorChange={(id, value) => setCancelInitiator((prev) => ({ ...prev, [id]: value }))}
        onEdit={openEdit}
        onMarkComplete={handleMarkComplete}
        onCancel={handleCancel}
        onNewSession={() => setShowForm(true)}
      />
    </div>
  )
}
