'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/ig-session.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { MonthYearSelector } from '@/components/hr/dashboard'
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

export default function IGSessionHistoryPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [sessions, setSessions] = useState<Session[]>([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!accessToken) return
    setLoading(true); setError('')
    try {
      const data = await getAll({ month, year }, accessToken)
      setSessions(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load session history')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

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

      <MonthYearSelector month={month} onMonthChange={setMonth} year={year} onYearChange={setYear} loading={loading} onRefresh={load} />

      {loading ? (
        <div className="card"><SkeletonTable rows={8} cols={8} /></div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📝"
            title="No sessions logged yet"
            description={`No sessions were found for ${MONTH_NAMES[month - 1]} ${year}.`}
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
                  <th>Chapter</th>
                  <th>Session</th>
                  <th>Start–End</th>
                  <th style={{ textAlign: 'right' }}>Time Taken</th>
                  <th>Updated By</th>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
        Read-only — contact HR to make corrections.
      </p>
    </div>
  )
}
