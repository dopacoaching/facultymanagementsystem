'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/ig-session.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { toLocalISO } from '@/utils/date'
import type { Session } from '@/types'
import { getMyCampus } from '@/services/campus.service'
import { getBatches } from '@/services/faculty.service'
import { EditOwnEntry } from '@/components/coordinator/EditOwnEntry'
import { editWindowRemainingMs, formatTimeLeft } from '@/lib/utils/teacherEdit'
import { update as updateEntry } from '@/services/ig-session.service'

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

export default function IGSessionHistoryPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [sessions, setSessions] = useState<Session[]>([])
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(toLocalISO(now))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teacherNames, setTeacherNames] = useState<string[]>([])
  const [campusBatches, setCampusBatches] = useState<{ _id: string; name: string }[]>([])
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
  useEffect(() => {
    if (!accessToken) return
    getMyCampus(accessToken).then(async (c) => {
      setTeacherNames(c.teachers)
      if (!c.batchCampusId) return
      const all = await getBatches(accessToken)
      setCampusBatches(all.filter((b) => (typeof b.campusId === 'object' ? b.campusId._id : b.campusId) === c.batchCampusId))
    }).catch(() => setTeacherNames([]))
  }, [accessToken])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Session History</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Every IG session you&apos;ve logged.
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
      </div>

      {loading ? (
        <div className="card"><SkeletonTable rows={8} cols={8} /></div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No sessions logged yet"
            description={`No sessions were found for ${from} to ${to}.`}
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Faculty</th>
                  <th>Subject</th>
                  <th>Batch</th>
                  <th>Chapter</th>
                  <th>Session</th>
                  <th>Start–End</th>
                  <th style={{ textAlign: 'right' }}>Time Taken</th>
                  <th>Updated By</th>
                  <th>Comment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const facultyName = typeof s.facultyId === 'object' ? s.facultyId.name : s.facultyId
                  return (
                    <tr key={s._id}>
                      <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>{facultyName}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.subject}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.batchNames?.length ? s.batchNames.join(', ') : '—'}</td>
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
                      <td style={{ color: 'var(--color-text-secondary)' }}>{s.updatedByName ?? '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)', minWidth: 160, whiteSpace: 'pre-wrap' }}>{s.comment || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {editWindowRemainingMs(s.createdAt) > 0 && s.status !== 'CANCELLED' && (
                          <>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(s)}>Edit</button>
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                              {formatTimeLeft(editWindowRemainingMs(s.createdAt))}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
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

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
        You can edit an entry for 24 hours after you push it. After that, contact HR to make corrections.
      </p>
    </div>
  )
}
