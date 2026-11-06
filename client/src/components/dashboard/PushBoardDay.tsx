'use client'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert, EmptyState, SkeletonCard } from '@/components/ui/Skeleton'
import { toLocalISO } from '@/utils/date'
import { Icon } from '@/components/ui/Icon'
import css from './Dashboard.module.css'

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
    <section className={css.hero} aria-labelledby="pushboard-title">
      <div className={css.heroHead}>
        <div>
          <span className="eyebrow">Push Board</span>
          <h2 id="pushboard-title" className={css.heroTitle}>{isToday ? 'Today' : fmtDay(day)}</h2>
          <p className={css.sectionSub}>Campus submissions for the selected day</p>
        </div>
        <div className={css.stepper}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => step(-1)} aria-label="Previous day">
            <Icon name="chevronLeft" size={14} /> Prev
          </button>
          <input
            type="date"
            className={`input ${css.dateInput}`}
            aria-label="Push Board day"
            value={day}
            max={todayISO}
            onChange={(e) => setDay(e.target.value)}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => step(1)} disabled={isToday} aria-label="Next day">
            Next <Icon name="chevronRight" size={14} />
          </button>
          {!isToday && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setDay(todayISO)}>Today</button>
          )}
        </div>
      </div>

      {res.status === 'error' && (
        <ErrorAlert message={res.error?.message ?? ''} what={`Couldn't load ${fmtDay(day)}`} onRetry={res.refetch} />
      )}

      <div aria-live="polite">
        {!report && res.status !== 'error' ? (
          <SkeletonCard lines={3} showHeader={false} />
        ) : report && (
          <div className="stack">
            {report.campuses.length === 0 ? (
              <p className="text-muted">No campuses are configured for tracking.</p>
            ) : (
              <div className={`${css.campusGrid} ${res.isRefetching ? css.dim : ''}`}>
                {report.campuses.map((name) => {
                  const rows = report.sessions.filter((s) => s.campusName === name)
                  const hours = rows.reduce((n, s) => n + s.durationHours, 0)
                  const submitted = rows.length > 0
                  const noClass = !submitted && report.noClass.some((n) => n.campusName === name && n.batchIds.length === 0)
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
                    <div key={name} className={css.campus}>
                      <div className={css.campusTop}>
                        <span className={css.campusName}>{name}</span>
                        <span className={`badge badge-dot ${cls}`} style={{ flexShrink: 0 }}>{label}</span>
                      </div>
                      <div className={css.campusMeta}>
                        {submitted
                          ? <>{rows.length} {rows.length === 1 ? 'entry' : 'entries'} · <span className="mono">{formatHM(hours)}</span></>
                          : noClass ? 'Marked as no class'
                          : offDay ? 'Sunday'
                          : missed ? 'No entry was submitted' : 'No entry yet today'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="card card-flush">
              <div className="card-header">
                <h2>Entries · {isToday ? 'Today' : fmtDay(day)}</h2>
                <span className="badge badge-gray">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              {entries.length === 0 ? (
                <div className={css.cardFlushBody}>
                  <EmptyState title="No entries on this day" description="No campus has submitted an entry for the selected day." />
                </div>
              ) : (
                <div className={`table-wrapper table-stack is-sticky ${css.flatTable}`}>
                  <table>
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
                          <td data-label="Campus" className={css.cellStrong}>{e.campusName}{e.batchName ? <span className={css.cellSoft}> · {e.batchName}</span> : null}</td>
                          <td data-label="Faculty">{e.facultyName}</td>
                          <td data-label="Subject">{e.subject}</td>
                          <td data-label="Chapter" className={css.cellMuted}>{e.chapter || '—'}</td>
                          <td data-label="Time" className={`num ${css.nowrap}`}>{e.startTime ? `${e.startTime}–${e.endTime || '—'}` : '—'}</td>
                          <td data-label="Hours" className={`num ${css.hoursCell}`} style={{ textAlign: 'right' }}>{e.entryType && <span className={`badge ${e.entryType === 'SHOOT' ? 'badge-blue' : 'badge-gray'}`}>{e.entryType === 'SHOOT' ? 'Shoot' : 'Live'}</span>}{formatHM(e.durationHours)}</td>
                          <td data-label="Entered by" className={css.cellMuted}>{e.updatedByName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
