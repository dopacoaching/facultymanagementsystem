'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, update, remove } from '@/services/session.service'
import { getBatches, type Batch } from '@/services/faculty.service'
import { useActiveFaculty } from '@/hooks/useActiveFaculty'
import { useChapterOptions } from '@/components/coordinator/log-session/ChaptersField'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { EditClassSessionModal, formFromSession, timingChanged, EditClassSessionForm } from '@/components/hr/reports/EditClassSessionModal'
import { usesFullBreak } from '@/lib/constants/entryTypes'
import { computeDuration, computeShootDuration } from '@/components/coordinator/log-session'
import { useToast } from '@/components/ui/Toast'
import { toLocalISO } from '@/utils/date'
import type { Session } from '@/types'

function formatHM(durationHours: number): string {
  const totalMinutes = Math.round(durationHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Compact "morning / lunch / afternoon" break summary for the report table. */
function breakSummary(s: Session): string {
  const parts = [s.breakMinutes, s.lunchBreakMinutes, s.afternoonBreakMinutes]
  if (parts.every((p) => p == null)) return '—'
  if (parts.every((p) => p == null || p === 0)) return 'Nil'
  return parts.map((p) => (p ? String(p) : '·')).join(' / ') + 'm'
}

import { CLASS_MODE_FILTERS } from '@/lib/constants/classModes'

const CLASS_MODE_LABELS: Record<string, string> = {
  ONLINE:                  'Online',
  OFFLINE:                 'Offline',
  ONLINE_DOUBT_CLEARANCE:  'Online Doubt Clearance',
  OFFLINE_DOUBT_CLEARANCE: 'Offline Doubt Clearance',
}

export default function ClassSessionsPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(toLocalISO(now))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [facultyFilter, setFacultyFilter] = useState('')
  /** Sort the table by date, or group it by mode so each mode's sessions sit together. */
  const [sortBy, setSortBy] = useState<'date' | 'mode'>('date')

  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editForm, setEditForm] = useState<EditClassSessionForm | null>(null)
  const [editError, setEditError] = useState('')
  const facultyOptions = useActiveFaculty(accessToken)
  const { options: chapterOptions } = useChapterOptions(editForm?.subject ?? '', accessToken)
  const [batchOptions, setBatchOptions] = useState<Batch[]>([])
  const [editBatchIds, setEditBatchIds] = useState<string[]>([])
  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then(setBatchOptions).catch(() => setBatchOptions([]))
  }, [accessToken])
  const batchCampusOf = (b: Batch) => (typeof b.campusId === 'object' ? b.campusId._id : b.campusId)
  const batchIdsOf = (s: Session) => [s.batchId, ...(s.extraBatchIds ?? [])].filter((id): id is string => !!id)
  const [saving, setSaving] = useState(false)

  const canSeeScheduledTime = role === 'HR_MANAGER' || role === 'ADMIN'
  const canEdit = role === 'HR_MANAGER' || role === 'ADMIN'

  async function handleDelete(s: Session) {
    if (!accessToken || !window.confirm('Delete this entry permanently? This cannot be undone.')) return
    try {
      await remove(s._id, accessToken)
      toast.success('Entry deleted', 'The entry has been removed.')
      await load()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Could not delete the entry')
    }
  }

  function openEdit(s: Session) {
    setEditingSession(s)
    setEditForm(formFromSession(s))
    setEditBatchIds(batchIdsOf(s))
    setEditError('')
  }

  // HR can only regroup batches inside the entry's own campus.
  const editCampusId = editingSession?.batchId
    ? batchOptions.find((b) => b._id === editingSession.batchId)?.campusId
    : undefined
  const editPickerBatches = editCampusId === undefined ? [] : batchOptions.filter((b) => batchCampusOf(b) === (typeof editCampusId === 'object' ? editCampusId._id : editCampusId))

  async function saveEdit() {
    if (!editingSession || !editForm || !accessToken) return
    const isShoot = editForm.entryType === 'SHOOT'
    const changed = timingChanged(editForm, formFromSession(editingSession))
    const classDuration = isShoot ? null : computeDuration(editForm.startTime, editForm.endTime, editForm.breaks, { fullBreak: usesFullBreak(editForm.entryType) })
    const duration = classDuration ?? computeShootDuration(editForm.shootHours, editForm.shootMinutes)
    if (changed && duration.error) { setEditError(duration.error); return }
    const original = batchIdsOf(editingSession)
    const batchesChanged = editBatchIds.length !== original.length || editBatchIds.some((id) => !original.includes(id))
    if (editPickerBatches.length > 1 && editBatchIds.length === 0) { setEditError('Select at least one batch'); return }

    setSaving(true); setEditError('')
    try {
      await update(editingSession._id, {
        ...(editForm.facultyId !== formFromSession(editingSession).facultyId ? { facultyId: editForm.facultyId } : {}),
        subject:       editForm.subject.trim(),
        chapters:      editForm.chapters,
        classMode:     editForm.classMode || undefined,
        updatedByName: editForm.updatedByName.trim() || undefined,
        ...(editForm.comment.trim() !== (editingSession.comment ?? '').trim() ? { comment: editForm.comment.trim() } : {}),
        // Timing is only sent when it changed — the server recalculates hours from it.
        ...(changed
          ? {
              durationHours: duration.hours,
              entryType:     editForm.entryType || undefined,
              // A Shoot has no start/end/break — only the time taken.
              ...(classDuration
                ? {
                    startTime:             editForm.startTime,
                    endTime:               editForm.endTime,
                    breakMinutes:          classDuration.morningBreak,
                    lunchBreakMinutes:     classDuration.lunchBreak,
                    afternoonBreakMinutes: classDuration.afternoonBreak,
                  }
                : {}),
            }
          : {}),
        sessionDate:   editForm.sessionDate,
        ...(batchesChanged && editBatchIds.length ? { batchIds: editBatchIds } : {}),
      }, accessToken)
      toast.success('Session updated', 'The changes have been saved.')
      setEditingSession(null)
      setEditForm(null)
      await load()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Failed to update session')
    } finally {
      setSaving(false)
    }
  }

  async function load() {
    if (!accessToken) return
    setLoading(true); setError('')
    try {
      const data = await getAll({ from, to }, accessToken)
      setSessions(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load class sessions')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  // Only rows logged via the campus-login class-teacher flow
  const facultyNameOf = (s: Session) => (typeof s.facultyId === 'object' ? s.facultyId.name : String(s.facultyId))
  const facultyChoices = useMemo(
    () => Array.from(new Set(sessions.filter((s) => s.campusName).map(facultyNameOf))).sort((a, b) => a.localeCompare(b)),
    [sessions], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const MODE_ORDER = CLASS_MODE_FILTERS.map((m) => m.value as string)
  const classSessions = useMemo(() => {
    const list = sessions
      .filter((s) => s.campusName)
      .filter((s) => !modeFilter || s.classMode === modeFilter)
      .filter((s) => !facultyFilter || facultyNameOf(s) === facultyFilter)
    if (sortBy === 'mode') {
      const rank = (s: Session) => { const i = MODE_ORDER.indexOf(s.classMode ?? ''); return i < 0 ? MODE_ORDER.length : i }
      return [...list].sort((a, b) => rank(a) - rank(b) || String(a.sessionDate).localeCompare(String(b.sessionDate)))
    }
    return list
  }, [sessions, modeFilter, facultyFilter, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Class Sessions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Sessions logged by class teachers, campus by campus.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="cs-mode">Class mode</label>
            <select id="cs-mode" className="input" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} style={{ minWidth: 210 }}>
              <option value="">All modes</option>
              {CLASS_MODE_FILTERS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="cs-faculty">Faculty</label>
            <select id="cs-faculty" className="input" value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)} style={{ minWidth: 210 }}>
              <option value="">All faculty</option>
              {facultyChoices.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="cs-sort">Sort by</label>
            <select id="cs-sort" className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'mode')} style={{ minWidth: 150 }}>
              <option value="date">Date</option>
              <option value="mode">Class mode</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card"><SkeletonTable rows={8} cols={10} /></div>
      ) : classSessions.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No class sessions logged"
            description={modeFilter || facultyFilter
              ? `No class-teacher sessions match these filters for ${from} to ${to}. Clear the class mode or faculty filter to see more.`
              : `No class-teacher sessions were found for ${from} to ${to}.`}
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Batch</th>
                  <th>Chapter</th>
                  <th>Campus</th>
                  <th>Mode</th>
                  {canSeeScheduledTime && <th>Scheduled</th>}
                  <th>Start–End</th>
                  <th style={{ textAlign: 'right' }}>Time Taken</th>
                  <th style={{ textAlign: 'right' }}>Break</th>
                  <th>Updated By</th>
                  <th>Comment</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {classSessions.map((s) => {
                  const facultyName = typeof s.facultyId === 'object' ? s.facultyId.name : s.facultyId
                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{facultyName}</td>
                      <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.subject}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.batchNames?.length ? s.batchNames.join(', ') : '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.chapter}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.campusName}</td>
                      <td>
                        <span className={`badge ${s.classMode?.startsWith('ONLINE') ? 'badge-blue' : 'badge-green'}`}>
                          {s.classMode ? CLASS_MODE_LABELS[s.classMode] ?? s.classMode : '—'}
                        </span>
                      </td>
                      {canSeeScheduledTime && (
                        <td style={{ whiteSpace: 'nowrap' }}>{s.scheduledTime ? (s.scheduledEndTime ? `${s.scheduledTime} – ${s.scheduledEndTime}` : s.scheduledTime) : '—'}</td>
                      )}
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {s.startTime ? `${s.startTime}–${s.endTime ?? '—'}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {s.entryType && <span className={`badge ${s.entryType === 'SHOOT' ? 'badge-blue' : 'badge-gray'}`} style={{ marginLeft: '0.5rem' }}>{s.entryType === 'SHOOT' ? 'Shoot' : 'Live'}</span>}{formatHM(s.durationHours)}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {breakSummary(s)}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.updatedByName ?? '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)', minWidth: 160, whiteSpace: 'pre-wrap' }}>{s.comment || '—'}</td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => handleDelete(s)}>Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingSession && editForm && (
        <EditClassSessionModal
          form={editForm}
          setForm={(updater) => setEditForm((f) => (f ? updater(f) : f))}
          error={editError}
          saving={saving}
          onClose={() => { setEditingSession(null); setEditForm(null) }}
          onSubmit={saveEdit}
          chapterOptions={chapterOptions}
          faculty={facultyOptions}
          batches={editPickerBatches}
          batchIds={editBatchIds}
          onBatchIdsChange={setEditBatchIds}
        />
      )}
    </div>
  )
}
