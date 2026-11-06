'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { fmtDay } from '@/components/hr/reports/reportShared'
import { toLocalISO, defaultHistoryFrom } from '@/utils/date'
import { EditOwnEntry } from '@/components/coordinator/EditOwnEntry'
import { editWindowRemainingMs, formatTimeLeft } from '@/lib/utils/teacherEdit'
import type { Session } from '@/types'
import type { JointHistoryRow } from '@/lib/utils/jointHistory'
import { CLASS_MODE_LABELS as MODE_LABELS } from '@/lib/constants/classModes'
import { Icon } from '@/components/ui/Icon'
import s from '@/components/coordinator/Entry.module.css'


function formatHM(durationHours: number): string {
  const totalMinutes = Math.round(durationHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Every joint class entered through a joint-entry login, newest first. The login can correct
 *  an entry for 24 hours after it was entered (the server enforces it); after that HR/Admin
 *  change or delete it from the Entries Report. */
export function JointHistory({ endpoint, subject, save }: {
  endpoint: string
  subject: string
  /** PATCH for one entry — the IG or the campus session endpoint. */
  save: (sessionId: string, data: Record<string, unknown>, token: string) => Promise<unknown>
}) {
  const { accessToken } = useAppSelector((s) => s.auth)
  const now = new Date()
  const [from, setFrom] = useState(defaultHistoryFrom(now))
  const [to, setTo] = useState(toLocalISO(now))
  const [rows, setRows] = useState<JointHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Session | null>(null)

  async function load() {
    if (!accessToken) return
    if (from > to) { setError('The start date must not be after the end date.'); return }
    setLoading(true); setError('')
    try {
      setRows(await apiFetch<JointHistoryRow[]>(`${endpoint}?from=${from}&to=${to}`, { token: accessToken }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load the history')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalHours = rows.reduce((sum, r) => sum + r.durationHours, 0)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Joint Class History</h1>
          <p className="page-subtitle">Every joint class entered for {subject}.</p>
        </div>
      </div>

      {error && <div style={{ marginBottom: 'var(--space-4)' }}><ErrorAlert message={error} onRetry={load} /></div>}

      <div className="toolbar">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
      </div>

      {loading && rows.length === 0 ? (
        <div className="card card-flush"><SkeletonTable rows={6} cols={7} /></div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState title="No joint classes" description={`No joint classes between ${fmtDay(from)} and ${fmtDay(to)}.`} /></div>
      ) : (
        <>
          <p className={s.historySummary} aria-live="polite">
            <strong>{rows.length}</strong> {rows.length === 1 ? 'class' : 'classes'} · <strong>{formatHM(totalHours)}</strong> in total
          </p>
          <div className="card card-flush">
            <div className="table-wrapper table-stack">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Faculty</th><th>Subject</th><th>Chapter</th><th>Campuses</th><th>Batches</th>
                    <th>Class mode</th><th>Start–End</th><th className="num" style={{ textAlign: 'right' }}>Time</th><th>Entered by</th><th>Comment</th>
                    <th><span className={s.srOnly}>Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const canEdit = editWindowRemainingMs(r.createdAt) > 0
                    return (
                      <tr key={r._id}>
                        <td data-label="Date" className={`${s.secondary} ${s.nowrap}`}>{fmtDay(r.date)}</td>
                        <td data-label="Faculty" className={s.strong}>{r.facultyName}</td>
                        <td data-label="Subject" className={s.secondary}>{r.subject}</td>
                        <td data-label="Chapter" className={s.secondary}>{r.chapter || '—'}</td>
                        <td data-label="Campuses">{r.campuses.join(' + ') || '—'}</td>
                        <td data-label="Batches" className={s.secondary}>{r.batchNames.join(', ') || '—'}</td>
                        <td data-label="Class mode">
                          {r.classMode
                            ? <span className={`badge ${r.classMode.startsWith('ONLINE') ? 'badge-blue' : 'badge-green'}`}>{MODE_LABELS[r.classMode] ?? r.classMode}</span>
                            : '—'}
                        </td>
                        <td data-label="Start–End" className={`num ${s.nowrap}`}>{r.startTime ? `${r.startTime}–${r.endTime || '—'}` : '—'}</td>
                        <td data-label="Time" className={`num ${s.strong} ${s.nowrap}`} style={{ textAlign: 'right' }}>{formatHM(r.durationHours)}</td>
                        <td data-label="Entered by" className={s.secondary}>{r.enteredBy || '—'}</td>
                        <td data-label="Comment" className={s.comment}>{r.comment || '—'}</td>
                        <td data-label="Actions" className={s.actionCell}>
                          {canEdit && (
                            <span className={s.editCell}>
                              <span className={s.timeLeft}>{formatTimeLeft(editWindowRemainingMs(r.createdAt))}</span>
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(r.session)}>
                                <Icon name="edit" size={14} /> Edit
                              </button>
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
          teacherNames={editing.updatedByName ? [editing.updatedByName] : []}
          save={(id, data) => save(id, data, accessToken!)}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
