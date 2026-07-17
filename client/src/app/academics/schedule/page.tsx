'use client'
import { toLocalISO } from '@/utils/date'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty, getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Faculty } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { EmptyState } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  ClassEntry, Schedule, EMPTY_ENTRY, dayFromDateStr,
  ScheduleEntryForm, ScheduleCard,
} from '@/components/academics/schedule'

/** Return the most recent Saturday as YYYY-MM-DD (current week start).
 *  The schedule week runs Sat→Fri per the DAY_OFFSETS in WeeklySchedule.
 *  Formula: (getDay() - 6 + 7) % 7 gives days-since-last-Saturday.
 */
function currentWeekSaturday(): string {
  const d = new Date()
  const daysBack = (d.getDay() - 6 + 7) % 7   // 0 if today is Sat, 1 if Sun, …
  d.setDate(d.getDate() - daysBack)
  return toLocalISO(d)
}

export default function SchedulePage() {
  const { accessToken, role, batchId: coordinatorBatchId, batchType: scopedBatchType } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const isCoordinator = role === 'COORDINATOR'

  const [schedules, setSchedules]     = useState<Schedule[]>([])
  const [batches,   setBatches]       = useState<Batch[]>([])
  const [faculty,   setFaculty]       = useState<Faculty[]>([])
  const [batchId,   setBatchId]       = useState('')
  const [weekStart, setWeekStart]     = useState(currentWeekSaturday)
  const [saving,    setSaving]        = useState(false)
  const [publishing, setPublishing]   = useState('')
  const [revising,  setRevising]      = useState('')
  const [deleting,  setDeleting]      = useState('')
  const [error,     setError]         = useState('')
  const [success,   setSuccess]       = useState('')

  // Form state
  const [entries, setEntries] = useState<ClassEntry[]>([])

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
      const ac = list.filter((b) => b.type !== 'IG' && (!scopedBatchType || b.type === scopedBatchType))
      const visible = isCoordinator && coordinatorBatchId
        ? ac.filter((b) => b._id === coordinatorBatchId)
        : ac
      setBatches(visible)
      if (visible.length && !batchId) setBatchId(visible[0]._id)
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => { if (batchId) load() }, [batchId, load])

  // Auto-derive weekStart from the earliest session date in the entries.
  // Falls back to the current week's Saturday when there are no dated entries
  // (e.g. exam-only rows, or a just-loaded draft with no changes yet).
  useEffect(() => {
    const dated = entries
      .filter((e) => e.sessionDate)
      .map((e) => new Date(e.sessionDate! + 'T12:00:00'))
      .sort((a, b) => a.getTime() - b.getTime())
    if (dated.length === 0) return   // keep whatever weekStart was set (draft or default)
    const d = new Date(dated[0])
    const daysBack = (d.getDay() - 6 + 7) % 7
    d.setDate(d.getDate() - daysBack)
    setWeekStart(toLocalISO(d))
  }, [entries])

  // ── Entry helpers ───────────────────────────────────────────────────────────

  function updateEntry(idx: number, key: keyof ClassEntry, val: string) {
    setEntries((prev) => prev.map((e, i) => {
      if (i !== idx) return e
      const updated: ClassEntry = { ...e, [key]: val }
      // When exam day changes, sync the row's day too
      if (key === 'examDay' && val) updated.day = val as ClassEntry['day']
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
    if (!batchId) { setError('Select a batch'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const validEntries = entries.filter((e) => e.subject.trim() && e.chapter.trim())

      // Enforce that sessionDate and facultyId are required for all class sessions (non-exams)
      const missingDateEntry = validEntries.find(
        (e) => (e.sessionType === 'LIVE_SESSION' || e.sessionType === 'RECORDED_VIDEO') && !e.sessionDate
      )
      if (missingDateEntry) {
        setError(`Date is required for class session: ${missingDateEntry.subject} - ${missingDateEntry.chapter}`)
        setSaving(false)
        return
      }

      const missingFacultyEntry = validEntries.find(
        (e) => (e.sessionType === 'LIVE_SESSION' || e.sessionType === 'RECORDED_VIDEO') && !e.facultyId
      )
      if (missingFacultyEntry) {
        setError(`Faculty is required for class session: ${missingFacultyEntry.subject} - ${missingFacultyEntry.chapter}`)
        setSaving(false)
        return
      }

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
      toast.success('Schedule saved', 'Weekly schedule has been created successfully.')
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
      toast.success('Schedule published', 'The schedule is now visible to students and faculty.')
      setSuccess('Schedule published successfully.')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally { setPublishing('') }
  }

  async function handleRevise(scheduleId: string) {
    if (!accessToken) return
    setRevising(scheduleId); setError('')
    try {
      const res = await apiFetch<{ revision: Schedule }>(`/academics/schedules/${scheduleId}/revise`, {
        token: accessToken, method: 'POST',
      })
      setSuccess('Revision draft created. Edit and publish the draft to replace the current schedule.')
      load()
      if (res && res.revision) {
        handleLoadDraft(res.revision)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Revise failed')
    } finally { setRevising('') }
  }

  // ── Delete Draft ────────────────────────────────────────────────────────────

  async function handleDeleteDraft(scheduleId: string) {
    if (!accessToken) return
    if (!confirm('Are you sure you want to discard this draft?')) return
    setDeleting(scheduleId); setError(''); setSuccess('')
    try {
      await apiFetch(`/academics/schedules/${scheduleId}`, { token: accessToken, method: 'DELETE' })
      setSuccess('Draft discarded successfully.')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to discard draft')
    } finally { setDeleting('') }
  }

  // ── Edit/Load Draft ──────────────────────────────────────────────────────────

  function handleLoadDraft(s: Schedule) {
    setError(''); setSuccess('')
    const bId = typeof s.batchId === 'object' ? s.batchId._id : s.batchId
    setBatchId(bId)
    setWeekStart(s.weekStartDate.slice(0, 10))
    setEntries(s.classEntries.map((e) => ({
      day:           e.day,
      subject:       e.subject,
      chapter:       e.chapter,
      sessionType:   e.sessionType,
      durationHours: e.durationHours,
      facultyId:     typeof e.facultyId === 'object' ? e.facultyId._id : (e.facultyId || ''),
      notes:         e.notes || '',
      sessionDate:   e.sessionDate ? e.sessionDate.slice(0, 10) : undefined,
      startTime:     e.startTime || '',
      examDay:       e.examDay,
      examDate:      e.examDate ? e.examDate.slice(0, 10) : undefined,
    })))
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

      {canEdit && (
        <ScheduleEntryForm
          batches={batches}
          faculty={faculty}
          batchId={batchId}
          onBatchChange={setBatchId}
          isCoordinator={isCoordinator}
          entries={entries}
          onUpdateEntry={updateEntry}
          onAddEntry={addEntry}
          onRemoveEntry={removeEntry}
          error={error}
          success={success}
          saving={saving}
          onSave={handleSave}
        />
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
          <EmptyState
            icon="🗓"
            title="No schedules yet"
            description="Create the first weekly schedule using the form above."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sorted.map((s) => (
            <ScheduleCard
              key={s._id}
              schedule={s}
              canEdit={canEdit}
              canPublish={canPublish}
              canRevise={canRevise}
              publishing={publishing}
              revising={revising}
              deleting={deleting}
              onEditDraft={handleLoadDraft}
              onPublish={handlePublish}
              onDeleteDraft={handleDeleteDraft}
              onRevise={handleRevise}
            />
          ))}
        </div>
      )}
    </div>
  )
}
