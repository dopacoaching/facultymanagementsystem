'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches, getAll as getFaculty } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { Skeleton, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  DailyResponse, ISChapter, Slot,
  TimetableFilterBar, SpecialDaysBanner, SessionGroupTable,
  AssignClassModal, AssignClassForm,
  SpecialDayModal, SpecialDayForm,
  fmtDate,
} from '@/components/integrated-school/timetable'

function today(): string {
  return todayLocal()
}

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
  const [form, setForm] = useState<AssignClassForm>({
    batchId:         '',
    campusId:        '',
    facultyId:       '',
    subject:         '',
    chapter:         '',
    examTopic:       '',
    startTime:       '',
    timeSlot:        'SESSION_1',
    sessionType:     'LIVE_SESSION',
    durationHours:   '',
    durationMinutes: 0,
    notes:           '',
    isUnplanned:     false,
  })

  // Special day form
  const [specialForm, setSpecialForm] = useState<SpecialDayForm>({
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

  function resetAssignForm() {
    setForm((f) => ({ ...f, subject: '', chapter: '', examTopic: '', notes: '', facultyId: '', startTime: '', durationHours: '', durationMinutes: 0, sessionType: 'LIVE_SESSION' }))
  }

  function closeAssignModal() {
    setShowAssign(false)
    setError('')
    resetAssignForm()
  }

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
    if (totalDuration === 0) {
      setError('Duration is required'); return
    }
    if (totalDuration < 0.25) {
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
          // Use the combined total so a minutes-only duration (e.g. 45m with
          // the hours box left blank) is not silently dropped.
          durationHours: totalDuration > 0 ? totalDuration : undefined,
        },
      })
      toast.success('Class assigned', 'Timetable slot has been created.')
      setShowAssign(false)
      resetAssignForm()
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

  const sessionGroups = [
    { label: 'Session 1', slots: [...session1Slots, ...morningSlots] },
    { label: 'Session 2', slots: session2Slots },
    { label: 'Session 3', slots: [...session3Slots, ...afternoonSlots] },
  ]
  const noSlotsAtAll = session1Slots.length === 0 && session2Slots.length === 0 && session3Slots.length === 0
    && morningSlots.length === 0 && afternoonSlots.length === 0

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

      <TimetableFilterBar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        filterCampusId={filterCampusId}
        onCampusChange={setFilterCampusId}
        campuses={campuses}
        today={today()}
      />

      <SpecialDaysBanner
        specialDays={daily?.specialDays ?? []}
        canDelete={canDelete}
        onDelete={handleDeleteSpecialDay}
      />

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
          {sessionGroups.map(({ label, slots }) => (
            <SessionGroupTable
              key={label}
              label={label}
              slots={slots}
              canManage={canManage}
              canDelete={canDelete}
              getBatchName={getBatchName}
              getFacultyName={getFacultyName}
              onMarkStatus={handleStatus}
              onDelete={handleDelete}
            />
          ))}

          {noSlotsAtAll && (
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

      {showAssign && (
        <AssignClassModal
          selectedDate={selectedDate}
          form={form}
          setForm={setForm}
          isIsBatches={isIsBatches}
          facultyList={facultyList}
          availableSubjects={availableSubjects}
          availableChapters={availableChapters}
          error={error}
          saving={saving}
          onClose={closeAssignModal}
          onSubmit={handleAssign}
        />
      )}

      {showSpecial && (
        <SpecialDayModal
          selectedDate={selectedDate}
          form={specialForm}
          setForm={setSpecialForm}
          campuses={campuses}
          error={error}
          saving={saving}
          onClose={() => { setShowSpecial(false); setError('') }}
          onSubmit={handleAddSpecialDay}
        />
      )}
    </div>
  )
}
