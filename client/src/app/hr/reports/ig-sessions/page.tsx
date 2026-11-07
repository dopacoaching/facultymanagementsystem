'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, update, cancel, remove } from '@/services/ig-session.service'
import { getBatches, type Batch } from '@/services/faculty.service'
import { useActiveFaculty } from '@/hooks/useActiveFaculty'
import { useChapterOptions } from '@/components/coordinator/log-session/ChaptersField'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { Icon } from '@/components/ui/Icon'
import rs from '@/components/hr/reports/Reports.module.css'
import { EditIGSessionReportModal, formFromIGSession, EditIGSessionForm } from '@/components/hr/reports/EditIGSessionReportModal'
import { computeDuration } from '@/components/coordinator/log-session'
import { useToast } from '@/components/ui/Toast'
import { toLocalISO } from '@/utils/date'
import type { Session } from '@/types'

const SLOT_LABELS: Record<string, string> = {
  SESSION_1: 'Session 1',
  SESSION_2: 'Session 2',
  SESSION_3: 'Other',
}

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

export default function IGClassSessionsPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(toLocalISO(now))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editForm, setEditForm] = useState<EditIGSessionForm | null>(null)
  const [editError, setEditError] = useState('')
  const facultyOptions = useActiveFaculty(accessToken)
  const { options: chapterOptions } = useChapterOptions(editForm?.subject ?? '', accessToken)
  const [batchOptions, setBatchOptions] = useState<Batch[]>([])
  const [editBatchIds, setEditBatchIds] = useState<string[]>([])
  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then(setBatchOptions).catch(() => setBatchOptions([]))
  }, [accessToken])
  const batchIdsOf = (s: Session) => [s.batchId, ...(s.extraBatchIds ?? [])].filter((id): id is string => !!id)
  const [saving, setSaving] = useState(false)

  const [cancelInitiator, setCancelInitiator] = useState<Record<string, string>>({})
  const [cancelling, setCancelling] = useState('')

  const canManage = role === 'HR_MANAGER' || role === 'ADMIN'

  function openEdit(s: Session) {
    setEditingSession(s)
    setEditForm(formFromIGSession(s))
    setEditBatchIds(batchIdsOf(s))
    setEditError('')
  }

  // HR can move an IG entry to any IG batch; the server checks that the selection is one school.
  const igBatchOptions = batchOptions
    .filter((b) => b.type === 'IG')
    .map((b) => ({ _id: b._id, name: typeof b.campusId === 'object' ? `${b.name} · ${b.campusId.name}` : b.name }))

  async function saveEdit() {
    if (!editingSession || !editForm || !accessToken) return
    const duration = computeDuration(editForm.startTime, editForm.endTime, editForm.breaks)
    if (duration.error) { setEditError(duration.error); return }
    if (!editForm.timeSlot) { setEditError('Select the session slot'); return }
    if (editBatchIds.length === 0) { setEditError('Select at least one batch'); return }
    const original = batchIdsOf(editingSession)
    const batchesChanged = editBatchIds.length !== original.length || editBatchIds.some((id, i) => id !== original[i])

    setSaving(true); setEditError('')
    try {
      await update(editingSession._id, {
        ...(editForm.facultyId !== formFromIGSession(editingSession).facultyId ? { facultyId: editForm.facultyId } : {}),
        subject:       editForm.subject.trim(),
        chapters:      editForm.chapters,
        timeSlot:      editForm.timeSlot,
        updatedByName: editForm.updatedByName.trim() || undefined,
        ...(editForm.comment.trim() !== (editingSession.comment ?? '').trim() ? { comment: editForm.comment.trim() } : {}),
        startTime:     editForm.startTime,
        endTime:       editForm.endTime,
        breakMinutes:          duration.morningBreak,
        lunchBreakMinutes:     duration.lunchBreak,
        afternoonBreakMinutes: duration.afternoonBreak,
        durationHours: duration.hours,
        sessionDate:   editForm.sessionDate,
        ...(batchesChanged ? { batchIds: editBatchIds } : {}),
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

  async function handleDelete(id: string) {
    if (!accessToken || !window.confirm('Delete this entry permanently? This cannot be undone.')) return
    try {
      await remove(id, accessToken)
      toast.success('Entry deleted', 'The entry has been removed.')
      await load()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Could not delete the entry')
    }
  }

  async function handleCancel(id: string) {
    if (!accessToken) return
    const initiator = cancelInitiator[id]
    if (!initiator) { setError('Select a cancellation initiator before cancelling.'); return }
    setCancelling(id)
    try {
      await cancel(id, initiator, accessToken)
      toast.success('Session cancelled', 'The session has been cancelled.')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Cancel failed')
    } finally { setCancelling('') }
  }

  async function load() {
    if (!accessToken) return
    setLoading(true); setError('')
    try {
      const data = await getAll({ from, to }, accessToken)
      setSessions(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load IG class sessions')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const liveSessions = sessions.filter((x) => x.status !== 'CANCELLED')
  const cancelledCount = sessions.length - liveSessions.length
  const totalHours = liveSessions.reduce((t, x) => t + x.durationHours, 0)
  const distinctFaculty = new Set(sessions.map((x) => (x.facultyId && typeof x.facultyId === 'object' ? x.facultyId._id : String(x.facultyId)))).size

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>IG Class Sessions</h1>
          <p className="page-subtitle">Sessions logged by IG class teachers, batch by batch.</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className={`stats-grid ${rs.kpis}`} aria-live="polite">
          <div className="stat-card">
            <div className="stat-label">Sessions</div>
            <div className="stat-value">{sessions.length}</div>
            <div className="stat-sub">{cancelledCount > 0 ? `${cancelledCount} cancelled` : 'none cancelled'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total time</div>
            <div className="stat-value">{formatHM(totalHours)}</div>
            <div className="stat-sub">excluding cancelled</div>
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
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
        </div>
      </div>

      {loading ? (
        <div className="card card-flush"><SkeletonTable rows={8} cols={10} /></div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No IG sessions logged"
            description={`No IG class-teacher sessions were found for ${from} to ${to}.`}
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
                <th>Session</th>
                <th>Start–End</th>
                <th className="num" style={{ textAlign: 'right' }}>Time Taken</th>
                <th className="num" style={{ textAlign: 'right' }}>Break</th>
                <th>Updated By</th>
                <th>Comment</th>
                <th>Status</th>
                {canManage && <th><span className={rs.srOnly}>Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const facultyName = s.facultyId && typeof s.facultyId === 'object' ? s.facultyId.name : s.facultyId
                const isCancelled = s.status === 'CANCELLED'
                return (
                  <tr key={s._id} className={isCancelled ? rs.dim : undefined}>
                    <td data-label="Faculty" className={rs.strong}>{facultyName}</td>
                    <td data-label="Date" className={`num ${rs.nowrap} ${rs.muted}`}>
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td data-label="Subject" className={rs.muted}>{s.subject}</td>
                    <td data-label="Batch" className={rs.muted}>{s.batchNames?.length ? s.batchNames.join(', ') : '—'}</td>
                    <td data-label="Chapter" className={rs.muted}>{s.chapter}</td>
                    <td data-label="Session">
                      <span className="badge badge-green">{s.timeSlot ? SLOT_LABELS[s.timeSlot] ?? s.timeSlot : '—'}</span>
                    </td>
                    <td data-label="Start–End" className={`num ${rs.nowrap}`}>
                      {s.startTime ?? '—'}–{s.endTime ?? '—'}
                    </td>
                    <td data-label="Time Taken" className={`num ${rs.nowrap} ${rs.strong}`} style={{ textAlign: 'right' }}>
                      {formatHM(s.durationHours)}
                    </td>
                    <td data-label="Break" className={`num ${rs.nowrap}`} style={{ textAlign: 'right' }}>
                      {breakSummary(s)}
                    </td>
                    <td data-label="Updated By" className={rs.muted}>{s.updatedByName ?? '—'}</td>
                    <td data-label="Comment" className={rs.comment}>{s.comment || '—'}</td>
                    <td data-label="Status">
                      <span className={`badge badge-dot ${isCancelled ? 'badge-red' : 'badge-green'}`}>{s.status}</span>
                    </td>
                    {canManage && (
                      <td>
                        <div className={rs.rowActions}>
                          {!isCancelled && (
                            <>
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>
                                <Icon name="edit" size={14} /> Edit
                              </button>
                              <select
                                className={`input input-sm ${rs.cancelPick}`}
                                aria-label={`Cancellation initiator for ${facultyName}`}
                                value={cancelInitiator[s._id] ?? ''}
                                onChange={(e) => setCancelInitiator((prev) => ({ ...prev, [s._id]: e.target.value }))}
                              >
                                <option value="">Initiator…</option>
                                <option value="FACULTY">Faculty</option>
                                <option value="MANAGEMENT">Management</option>
                                <option value="STUDENT">Student</option>
                              </select>
                              <button
                                type="button"
                                className="btn btn-danger-ghost btn-sm"
                                disabled={cancelling === s._id}
                                onClick={() => handleCancel(s._id)}
                              >
                                {cancelling === s._id ? '…' : 'Cancel'}
                              </button>
                            </>
                          )}
                          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => handleDelete(s._id)}>Delete</button>
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
        <EditIGSessionReportModal
          form={editForm}
          setForm={(updater) => setEditForm((f) => (f ? updater(f) : f))}
          error={editError}
          saving={saving}
          onClose={() => { setEditingSession(null); setEditForm(null) }}
          onSubmit={saveEdit}
          chapterOptions={chapterOptions}
          faculty={facultyOptions}
          batches={igBatchOptions}
          batchIds={editBatchIds}
          onBatchIdsChange={setEditBatchIds}
        />
      )}
    </div>
  )
}
