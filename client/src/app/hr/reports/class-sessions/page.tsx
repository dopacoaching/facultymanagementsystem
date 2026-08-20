'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll, update } from '@/services/session.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { MonthYearSelector } from '@/components/hr/dashboard'
import { EditClassSessionModal, formFromSession, EditClassSessionForm } from '@/components/hr/reports/EditClassSessionModal'
import { computeDuration } from '@/components/coordinator/log-session'
import { useToast } from '@/components/ui/Toast'
import type { Session } from '@/types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatHM(durationHours: number): string {
  const totalMinutes = Math.round(durationHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

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
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editForm, setEditForm] = useState<EditClassSessionForm | null>(null)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  const canSeeScheduledTime = role === 'HR_MANAGER' || role === 'ADMIN'
  const canEdit = role === 'HR_MANAGER' || role === 'ADMIN'

  function openEdit(s: Session) {
    setEditingSession(s)
    setEditForm(formFromSession(s))
    setEditError('')
  }

  async function saveEdit() {
    if (!editingSession || !editForm || !accessToken) return
    const duration = computeDuration(editForm.startTime, editForm.endTime, Number(editForm.breakMinutes) === 0, editForm.breakMinutes)
    if (duration.error) { setEditError(duration.error); return }

    setSaving(true); setEditError('')
    try {
      await update(editingSession._id, {
        subject:       editForm.subject.trim(),
        chapter:       editForm.chapter.trim(),
        classMode:     editForm.classMode || undefined,
        updatedByName: editForm.updatedByName.trim() || undefined,
        startTime:     editForm.startTime,
        endTime:       editForm.endTime,
        breakMinutes:  Number(editForm.breakMinutes),
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

  async function load() {
    if (!accessToken) return
    setLoading(true); setError('')
    try {
      const data = await getAll({ month, year }, accessToken)
      setSessions(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load class sessions')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  // Only rows logged via the campus-login class-teacher flow
  const classSessions = useMemo(() => sessions.filter((s) => s.campusName), [sessions])

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

      <MonthYearSelector month={month} onMonthChange={setMonth} year={year} onYearChange={setYear} loading={loading} onRefresh={load} />

      {loading ? (
        <div className="card"><SkeletonTable rows={8} cols={10} /></div>
      ) : classSessions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📝"
            title="No class sessions logged"
            description={`No class-teacher sessions were found for ${MONTH_NAMES[month - 1]} ${year}.`}
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
                  <th>Campus</th>
                  <th>Mode</th>
                  {canSeeScheduledTime && <th>Scheduled</th>}
                  <th>Start–End</th>
                  <th style={{ textAlign: 'right' }}>Time Taken</th>
                  <th style={{ textAlign: 'right' }}>Break</th>
                  <th>Updated By</th>
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
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.chapter}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.campusName}</td>
                      <td>
                        <span className={`badge ${s.classMode?.startsWith('ONLINE') ? 'badge-blue' : 'badge-green'}`}>
                          {s.classMode ? CLASS_MODE_LABELS[s.classMode] ?? s.classMode : '—'}
                        </span>
                      </td>
                      {canSeeScheduledTime && (
                        <td style={{ whiteSpace: 'nowrap' }}>{s.scheduledTime ?? '—'}</td>
                      )}
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
                      {canEdit && (
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
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
        />
      )}
    </div>
  )
}
