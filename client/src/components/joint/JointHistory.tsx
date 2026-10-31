'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { fmtDay } from '@/components/hr/reports/reportShared'
import { toLocalISO } from '@/utils/date'
import type { JointHistoryRow } from '@/lib/utils/jointHistory'

const MODE_LABELS: Record<string, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  ONLINE_DOUBT_CLEARANCE: 'Online Doubt Clearance',
  OFFLINE_DOUBT_CLEARANCE: 'Offline Doubt Clearance',
}

function formatHM(durationHours: number): string {
  const totalMinutes = Math.round(durationHours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Every joint class entered through a joint-entry login, newest first. Read-only — HR/Admin
 *  change or delete an entry from the Entries Report. */
export function JointHistory({ endpoint, subject }: { endpoint: string; subject: string }) {
  const { accessToken } = useAppSelector((s) => s.auth)
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(toLocalISO(now))
  const [rows, setRows] = useState<JointHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Joint Class History</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Every joint class entered for {subject}.
          </p>
        </div>
      </div>

      {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} onRetry={load} /></div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
      </div>

      {loading && rows.length === 0 ? (
        <div className="card"><SkeletonTable rows={6} cols={7} /></div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState title="No joint classes" description={`No joint classes between ${fmtDay(from)} and ${fmtDay(to)}.`} /></div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: '0 0 0.75rem' }}>
            {rows.length} {rows.length === 1 ? 'class' : 'classes'} · <strong style={{ color: 'var(--color-text)' }}>{formatHM(totalHours)}</strong> in total
          </p>
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Faculty</th><th>Subject</th><th>Chapter</th><th>Campuses</th><th>Batches</th>
                    <th>Class mode</th><th>Start–End</th><th style={{ textAlign: 'right' }}>Time</th><th>Entered by</th><th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{fmtDay(r.date)}</td>
                      <td style={{ fontWeight: 600 }}>{r.facultyName}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{r.subject}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{r.chapter || '—'}</td>
                      <td>{r.campuses.join(' + ') || '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{r.batchNames.join(', ') || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.classMode ? MODE_LABELS[r.classMode] ?? r.classMode : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.startTime ? `${r.startTime}–${r.endTime || '—'}` : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatHM(r.durationHours)}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{r.enteredBy || '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)', minWidth: 160, whiteSpace: 'pre-wrap' }}>{r.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
