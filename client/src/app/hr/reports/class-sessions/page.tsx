'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, update, remove } from '@/services/session.service'
import { getBatches, type Batch } from '@/services/faculty.service'
import { useActiveFaculty } from '@/hooks/useActiveFaculty'
import { useChapterOptions } from '@/components/coordinator/log-session/ChaptersField'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { Icon } from '@/components/ui/Icon'
import rs from '@/components/hr/reports/Reports.module.css'
import { EditClassSessionModal, formFromSession, timingChanged, EditClassSessionForm } from '@/components/hr/reports/EditClassSessionModal'
import { usesFullBreak } from '@/lib/constants/entryTypes'
import { CLASS_MODE_FILTERS, CLASS_MODE_LABELS, CLASS_MODE_ORDER } from '@/lib/constants/classModes'
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

/** The faculty a session belongs to, by id (two faculty can share a name) and by display name. */
const facultyIdOf = (s: Session) => (s.facultyId && typeof s.facultyId === 'object' ? s.facultyId._id : String(s.facultyId ?? ''))
const facultyNameOf = (s: Session) => (s.facultyId && typeof s.facultyId === 'object' ? s.facultyId.name : String(s.facultyId ?? ''))
const dateMs = (s: Session) => new Date(s.sessionDate).getTime()
const modeRank = (s: Session) => { const i = CLASS_MODE_ORDER.indexOf(s.classMode ?? ''); return i < 0 ? CLASS_MODE_ORDER.length : i }

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
  const batchCampusOf = (b: Batch) => (b.campusId && typeof b.campusId === 'object' ? b.campusId._id : b.campusId)
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
  const facultyChoices = useMemo(() => {
    const byId = new Map<string, string>()
    for (const s of sessions) if (s.campusName) byId.set(facultyIdOf(s), facultyNameOf(s))
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name))
  }, [sessions])
  // A faculty picked for one date range may have no sessions in the next: then the filter is off, not stuck.
  const activeFaculty = facultyChoices.some((f) => f.id === facultyFilter) ? facultyFilter : ''
  const classSessions = useMemo(() => {
    const list = sessions
      .filter((s) => s.campusName)
      .filter((s) => !modeFilter || s.classMode === modeFilter)
      .filter((s) => !activeFaculty || facultyIdOf(s) === activeFaculty)
    return sortBy === 'mode' ? [...list].sort((a, b) => modeRank(a) - modeRank(b) || dateMs(a) - dateMs(b)) : list
  }, [sessions, modeFilter, activeFaculty, sortBy])

  const totalHours = classSessions.reduce((t, x) => t + x.durationHours, 0)
  const distinctFaculty = new Set(classSessions.map(facultyIdOf)).size

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Class Sessions</h1>
          <p className="page-subtitle">Sessions logged by class teachers, campus by campus.</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      {!loading && classSessions.length > 0 && (
        <div className={`stats-grid ${rs.kpis}`} aria-live="polite">
          <div className="stat-card">
            <div className="stat-label">Sessions</div>
            <div className="stat-value">{classSessions.length}</div>
            <div className="stat-sub">{modeFilter || activeFaculty ? 'matching filters' : 'in range'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total time</div>
            <div className="stat-value">{formatHM(totalHours)}</div>
            <div className="stat-sub">{totalHours.toFixed(2)} hours</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Faculty</div>
            <div className="stat-value">{distinctFaculty}</div>
            <div className="stat-sub">distinct faculty</div>
          </div>
        </div>
      )}

      <div className={rs.filters}>
        <div className={rs.filterRow}>
          <div className={`form-group ${rs.fieldWide}`}>
            <label className="label" htmlFor="cs-mode">Class mode</label>
            <select id="cs-mode" className="input" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
              <option value="">All modes</option>
              {CLASS_MODE_FILTERS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className={`form-group ${rs.fieldWide}`}>
            <label className="label" htmlFor="cs-faculty">Faculty</label>
            <select id="cs-faculty" className="input" value={activeFaculty} onChange={(e) => setFacultyFilter(e.target.value)}>
              <option value="">All faculty</option>
              {facultyChoices.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <span className="label" id="cs-sort-label">Sort by</span>
            <div className="segmented" role="group" aria-labelledby="cs-sort-label">
              <button type="button" aria-pressed={sortBy === 'date'} onClick={() => setSortBy('date')}>Date</button>
              <button type="button" aria-pressed={sortBy === 'mode'} onClick={() => setSortBy('mode')}>Class mode</button>
            </div>
          </div>
        </div>
        <div className={rs.filterRow}>
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
        </div>
      </div>

      {loading ? (
        <div className="card card-flush"><SkeletonTable rows={8} cols={10} /></div>
      ) : classSessions.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No class sessions logged"
            description={modeFilter || activeFaculty
              ? `No class-teacher sessions match these filters for ${from} to ${to}. Clear the class mode or faculty filter to see more.`
              : `No class-teacher sessions were found for ${from} to ${to}.`}
          />
        </div>
      ) : (
        <div className="table-wrapper table-stack is-sticky">
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
                <th className="num" style={{ textAlign: 'right' }}>Time Taken</th>
                <th className="num" style={{ textAlign: 'right' }}>Break</th>
                <th>Updated By</th>
                <th>Comment</th>
                {canEdit && <th><span className={rs.srOnly}>Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {classSessions.map((s) => {
                const facultyName = s.facultyId && typeof s.facultyId === 'object' ? s.facultyId.name : s.facultyId
                return (
                  <tr key={s._id}>
                    <td data-label="Faculty" className={rs.strong}>{facultyName}</td>
                    <td data-label="Date" className={`num ${rs.nowrap} ${rs.muted}`}>
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td data-label="Subject" className={rs.muted}>{s.subject}</td>
                    <td data-label="Batch" className={rs.muted}>{s.batchNames?.length ? s.batchNames.join(', ') : '—'}</td>
                    <td data-label="Chapter" className={rs.muted}>{s.chapter}</td>
                    <td data-label="Campus" className={rs.muted}>{s.campusName}</td>
                    <td data-label="Mode">
                      <span className={`badge ${s.classMode?.startsWith('ONLINE') ? 'badge-blue' : 'badge-green'}`}>
                        {s.classMode ? CLASS_MODE_LABELS[s.classMode] ?? s.classMode : '—'}
                      </span>
                    </td>
                    {canSeeScheduledTime && (
                      <td data-label="Scheduled" className={`num ${rs.nowrap}`}>{s.scheduledTime ? (s.scheduledEndTime ? `${s.scheduledTime} – ${s.scheduledEndTime}` : s.scheduledTime) : '—'}</td>
                    )}
                    <td data-label="Start–End" className={`num ${rs.nowrap}`}>
                      {s.startTime ? `${s.startTime}–${s.endTime ?? '—'}` : '—'}
                    </td>
                    <td data-label="Time Taken" className={`num ${rs.nowrap} ${rs.strong}`} style={{ textAlign: 'right' }}>
                      {s.entryType && <span className={`badge ${s.entryType === 'SHOOT' ? 'badge-blue' : 'badge-gray'} ${rs.entryTag}`}>{s.entryType === 'SHOOT' ? 'Shoot' : 'Live'}</span>}{formatHM(s.durationHours)}
                    </td>
                    <td data-label="Break" className={`num ${rs.nowrap}`} style={{ textAlign: 'right' }}>
                      {breakSummary(s)}
                    </td>
                    <td data-label="Updated By" className={rs.muted}>{s.updatedByName ?? '—'}</td>
                    <td data-label="Comment" className={rs.comment}>{s.comment || '—'}</td>
                    {canEdit && (
                      <td>
                        <div className={rs.rowActions}>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>
                            <Icon name="edit" size={14} /> Edit
                          </button>
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
