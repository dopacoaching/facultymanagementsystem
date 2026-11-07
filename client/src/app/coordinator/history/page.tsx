'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/session.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { toLocalISO, defaultHistoryFrom } from '@/utils/date'
import type { Session } from '@/types'
import { useCampusTeacherInfo } from '@/hooks/useCampusTeacherInfo'
import { EditOwnEntry } from '@/components/coordinator/EditOwnEntry'
import { editWindowRemainingMs, formatTimeLeft } from '@/lib/utils/teacherEdit'
import { update as updateEntry } from '@/services/session.service'
import { CLASS_MODE_LABELS } from '@/lib/constants/classModes'
import { Icon } from '@/components/ui/Icon'
import s from '@/components/coordinator/Entry.module.css'


function formatHM(durationHours: number): string {
  const totalMinutes = Math.round(durationHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function CampusHistoryPage() {
  const { accessToken, campusName } = useAppSelector((s) => s.auth)
  const [sessions, setSessions] = useState<Session[]>([])
  const now = new Date()
  const [from, setFrom] = useState(defaultHistoryFrom(now))
  const [to, setTo] = useState(toLocalISO(now))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { teacherNames, batches: campusBatches } = useCampusTeacherInfo(accessToken)
  const [editing, setEditing] = useState<Session | null>(null)

  async function load() {
    if (!accessToken) return
    setLoading(true); setError('')
    try {
      const data = await getAll({ from, to }, accessToken)
      setSessions(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load session history')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalHours = sessions.reduce((sum, x) => sum + x.durationHours, 0)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Session History</h1>
          <p className="page-subtitle">Every session logged for {campusName ?? 'your campus'}, by anyone using this login.</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      <div className="toolbar">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
      </div>

      {loading ? (
        <div className="card card-flush"><SkeletonTable rows={8} cols={7} /></div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No sessions logged yet"
            description={`No sessions were found for ${from} to ${to}.`}
          />
        </div>
      ) : (
        <>
          <p className={s.historySummary} aria-live="polite">
            <strong>{sessions.length}</strong> {sessions.length === 1 ? 'session' : 'sessions'} · <strong>{formatHM(totalHours)}</strong> in total
          </p>
          <div className="card card-flush">
            <div className="table-wrapper table-stack">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Faculty</th>
                    <th>Subject</th>
                    <th>Batch</th>
                    <th>Chapter</th>
                    <th>Mode</th>
                    <th>Start–End</th>
                    <th className="num" style={{ textAlign: 'right' }}>Time Taken</th>
                    <th>Updated By</th>
                    <th>Comment</th>
                    <th><span className={s.srOnly}>Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((x) => {
                    const facultyName = x.facultyId && typeof x.facultyId === 'object' ? x.facultyId.name : x.facultyId
                    const joint = !!x.jointCampuses?.length
                    const canEdit = !joint && editWindowRemainingMs(x.createdAt) > 0 && x.status !== 'CANCELLED'
                    return (
                      <tr key={x._id}>
                        <td data-label="Date" className={`${s.secondary} ${s.nowrap}`}>
                          {new Date(x.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td data-label="Faculty" className={s.strong}>{facultyName}</td>
                        <td data-label="Subject" className={s.secondary}>{x.subject}</td>
                        <td data-label="Batch" className={s.secondary}>{x.batchNames?.length ? x.batchNames.join(', ') : '—'}</td>
                        <td data-label="Chapter" className={s.secondary}>{x.chapter}</td>
                        <td data-label="Mode">
                          <span className={`badge ${x.classMode?.startsWith('ONLINE') ? 'badge-blue' : 'badge-green'}`}>
                            {x.classMode ? CLASS_MODE_LABELS[x.classMode] ?? x.classMode : '—'}
                          </span>
                        </td>
                        <td data-label="Start–End" className={`num ${s.nowrap}`}>
                          {x.startTime ?? '—'}–{x.endTime ?? '—'}
                        </td>
                        <td data-label="Time Taken" className={`num ${s.strong}`} style={{ textAlign: 'right' }}>
                          {formatHM(x.durationHours)}
                        </td>
                        <td data-label="Updated By" className={s.secondary}>{x.updatedByName ?? '—'}</td>
                        <td data-label="Comment" className={s.comment}>{x.comment || '—'}</td>
                        <td data-label="Actions" className={s.actionCell}>
                          {(joint || canEdit) && (
                            <span className={s.editCell}>
                              {joint && <span className="badge badge-gray">Joint class</span>}
                              {canEdit && (
                                <>
                                  <span className={s.timeLeft}>{formatTimeLeft(editWindowRemainingMs(x.createdAt))}</span>
                                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(x)}>
                                    <Icon name="edit" size={14} /> Edit
                                  </button>
                                </>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editing && (
        <EditOwnEntry
          session={editing}
          teacherNames={teacherNames}
          batches={campusBatches}
          save={(id, data) => updateEntry(id, data, accessToken!)}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}

      <p className={s.footnoteHistory}>
        You can edit an entry for 24 hours after you push it. After that, contact HR to make corrections.
      </p>
    </div>
  )
}
