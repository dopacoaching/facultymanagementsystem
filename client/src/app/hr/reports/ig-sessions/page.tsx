'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, update, cancel } from '@/services/ig-session.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { MonthYearSelector } from '@/components/hr/dashboard'
import { EditIGSessionReportModal, formFromIGSession, EditIGSessionForm } from '@/components/hr/reports/EditIGSessionReportModal'
import { computeDuration } from '@/components/coordinator/log-session'
import { useToast } from '@/components/ui/Toast'
import type { Session } from '@/types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SLOT_LABELS: Record<string, string> = {
  SESSION_1: 'Session 1',
  SESSION_2: 'Session 2',
  SESSION_3: 'Session 3',
}

function formatHM(durationHours: number): string {
  const totalMinutes = Math.round(durationHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function IGClassSessionsPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editForm, setEditForm] = useState<EditIGSessionForm | null>(null)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  const [cancelInitiator, setCancelInitiator] = useState<Record<string, string>>({})
  const [cancelling, setCancelling] = useState('')

  const canManage = role === 'HR_MANAGER' || role === 'ADMIN'

  function openEdit(s: Session) {
    setEditingSession(s)
    setEditForm(formFromIGSession(s))
    setEditError('')
  }

  async function saveEdit() {
    if (!editingSession || !editForm || !accessToken) return
    const duration = computeDuration(editForm.startTime, editForm.endTime, editForm.noBreak, editForm.breakMinutes)
    if (duration.error) { setEditError(duration.error); return }
    if (!editForm.timeSlot) { setEditError('Select the session slot'); return }

    setSaving(true); setEditError('')
    try {
      await update(editingSession._id, {
        subject:       editForm.subject.trim(),
        chapter:       editForm.chapter.trim(),
        timeSlot:      editForm.timeSlot,
        updatedByName: editForm.updatedByName.trim() || undefined,
        startTime:     editForm.startTime,
        endTime:       editForm.endTime,
        breakMinutes:  duration.breakMinutes,
        durationHours: duration.hours,
        sessionDate:   editForm.sessionDate,
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
      const data = await getAll({ month, year }, accessToken)
      setSessions(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load IG class sessions')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>IG Class Sessions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Sessions logged by IG class teachers, batch by batch.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      <MonthYearSelector month={month} onMonthChange={setMonth} year={year} onYearChange={setYear} loading={loading} onRefresh={load} />

      {loading ? (
        <div className="card"><SkeletonTable rows={8} cols={10} /></div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📝"
            title="No IG sessions logged"
            description={`No IG class-teacher sessions were found for ${MONTH_NAMES[month - 1]} ${year}.`}
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
                  <th>Chapter</th>
                  <th>Session</th>
                  <th>Start–End</th>
                  <th style={{ textAlign: 'right' }}>Time Taken</th>
                  <th style={{ textAlign: 'right' }}>Break</th>
                  <th>Updated By</th>
                  <th>Status</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const facultyName = typeof s.facultyId === 'object' ? s.facultyId.name : s.facultyId
                  const isCancelled = s.status === 'CANCELLED'
                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{facultyName}</td>
                      <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.subject}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.chapter}</td>
                      <td>
                        <span className="badge badge-green">{s.timeSlot ? SLOT_LABELS[s.timeSlot] ?? s.timeSlot : '—'}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {s.startTime ?? '—'}–{s.endTime ?? '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {formatHM(s.durationHours)}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {s.breakMinutes == null ? '—' : s.breakMinutes === 0 ? 'Nil' : `${s.breakMinutes}m`}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.updatedByName ?? '—'}</td>
                      <td>
                        <span className={`badge ${isCancelled ? 'badge-red' : 'badge-green'}`}>{s.status}</span>
                      </td>
                      {canManage && (
                        <td>
                          {!isCancelled && (
                            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                              <select
                                className="input input-sm"
                                value={cancelInitiator[s._id] ?? ''}
                                onChange={(e) => setCancelInitiator((prev) => ({ ...prev, [s._id]: e.target.value }))}
                                style={{ width: 120 }}
                              >
                                <option value="">Initiator…</option>
                                <option value="FACULTY">Faculty</option>
                                <option value="MANAGEMENT">Management</option>
                                <option value="STUDENT">Student</option>
                              </select>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={cancelling === s._id}
                                onClick={() => handleCancel(s._id)}
                              >
                                {cancelling === s._id ? '…' : 'Cancel'}
                              </button>
                            </div>
                          )}
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
        <EditIGSessionReportModal
          form={editForm}
          setForm={(updater) => setEditForm((f) => (f ? updater(f) : f))}
          error={editError}
          saving={saving}
          onClose={() => { setEditingSession(null); setEditForm(null) }}
          onSubmit={saveEdit}
        />
      )}
    </div>
  )
}
