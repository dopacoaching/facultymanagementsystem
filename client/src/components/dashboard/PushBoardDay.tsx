'use client'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert, EmptyState, SkeletonCard } from '@/components/ui/Skeleton'
import { toLocalISO } from '@/utils/date'

interface DayData {
  day: string
  report: EntriesReport
}

function formatHM(hours: number): string {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const fmtDay = (iso: string) =>
  parseISO(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const isSunday = (iso: string) => parseISO(iso).getDay() === 0

/**
 * Push Board status for ONE chosen day, across every campus. Has its own date
 * picker and its own fetch, so it never depends on the dashboard's date range.
 */
export function PushBoardDay() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const todayISO = toLocalISO(new Date())
  const [day, setDay] = useState(todayISO)
  const valid = !!day && day <= todayISO

  const res = useAsyncResource<DayData>(
    async () => ({ day, report: await getEntriesReport(day, day, accessToken!) }),
    [accessToken, day],
    { enabled: !!accessToken && valid },
  )
  const report = res.data && res.data.day === day ? res.data.report : null
  const isToday = day === todayISO

  const step = (n: number) => {
    const d = parseISO(day)
    d.setDate(d.getDate() + n)
    const next = toLocalISO(d)
    if (next <= todayISO) setDay(next)
  }

  const entries = (report?.sessions ?? [])
    .slice()
    .sort((a, b) => a.campusName.localeCompare(b.campusName) || a.startTime.localeCompare(b.startTime))

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h2 className="section-label" style={{ margin: 0 }}>Push Board · {isToday ? 'Today' : fmtDay(day)}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={() => step(-1)} aria-label="Previous day">‹ Prev</button>
          <input
            type="date"
            className="input"
            style={{ width: 'auto' }}
            aria-label="Push Board day"
            value={day}
            max={todayISO}
            onChange={(e) => setDay(e.target.value)}
          />
          <button type="button" className="btn btn-ghost" onClick={() => step(1)} disabled={isToday} aria-label="Next day">Next ›</button>
          {!isToday && (
            <button type="button" className="btn btn-outline" onClick={() => setDay(todayISO)}>Today</button>
          )}
        </div>
      </div>

      {res.status === 'error' && (
        <ErrorAlert message={res.error?.message ?? ''} what={`Couldn't load ${fmtDay(day)}`} onRetry={res.refetch} />
      )}

      {!report && res.status !== 'error' ? (
        <SkeletonCard lines={3} showHeader={false} />
      ) : report && (
        <>
          {report.campuses.length === 0 ? (
            <div className="card"><p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.875rem' }}>No campuses are configured for tracking.</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', opacity: res.isRefetching ? 0.6 : 1 }}>
              {report.campuses.map((name) => {
                const rows = report.sessions.filter((s) => s.campusName === name)
                const hours = rows.reduce((n, s) => n + s.durationHours, 0)
                const submitted = rows.length > 0
                const noClass = !submitted && report.noClass.some((n) => n.campusName === name)
                const offDay = !submitted && !noClass && isSunday(day)
                // The server flags a past day with neither entry nor No Class marker; today is still in progress.
                const missed = !submitted && !noClass && !offDay && !isToday
                  && report.missing.some((m) => m.campusName === name && m.dates.includes(day))
                const [cls, label] = submitted ? ['badge-green', 'Submitted']
                  : noClass ? ['badge-blue', 'No class']
                  : offDay ? ['badge-gray', 'Off day']
                  : missed ? ['badge-red', 'Not submitted']
                  : ['badge-yellow', 'Pending']
                return (
                  <div key={name} className="stat-card" style={{ gap: '0.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 650, fontSize: '0.875rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{label}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                      {submitted
                        ? `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'} · ${formatHM(hours)}`
                        : noClass ? 'Marked as no class'
                        : offDay ? 'Sunday'
                        : missed ? 'No entry was submitted' : 'No entry yet today'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <h2>Entries · {isToday ? 'Today' : fmtDay(day)}</h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {entries.length === 0 ? (
              <EmptyState title="No entries on this day" description="No campus has submitted an entry for the selected day." />
            ) : (
              <div className="table-wrapper">
                <table style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Campus</th>
                      <th>Faculty</th>
                      <th>Subject</th>
                      <th>Chapter</th>
                      <th>Time</th>
                      <th style={{ textAlign: 'right' }}>Hours</th>
                      <th>Entered by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e._id}>
                        <td style={{ fontWeight: 600 }}>{e.campusName}{e.batchName ? <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}> · {e.batchName}</span> : null}</td>
                        <td>{e.facultyName}</td>
                        <td>{e.subject}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{e.chapter || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{e.startTime || '—'}–{e.endTime || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatHM(e.durationHours)}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{e.updatedByName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
