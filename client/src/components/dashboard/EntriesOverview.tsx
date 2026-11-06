'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAppSelector } from '@/store/hooks'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert, EmptyState, SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { Icon } from '@/components/ui/Icon'
import { toLocalISO } from '@/utils/date'
import { PushBoardDay } from './PushBoardDay'
import { SubjectHours } from './SubjectHours'
import css from './Dashboard.module.css'

interface RangeData {
  from: string
  to: string
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

function fmtDay(iso: string, withYear = true): string {
  return parseISO(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  })
}

const isSunday = (iso: string) => parseISO(iso).getDay() === 0

interface CampusRow {
  campusName: string
  entries: number
  hours: number
  noClassDays: number
  missingDays: string[]
}

interface FacultyRow {
  facultyId: string
  name: string
  entries: number
  hours: number
}

interface Props {
  /** Extra stats rendered first (e.g. the Admin dashboard's faculty counts). */
  leading?: React.ReactNode
}

/**
 * Entries-based overview shared by the HR and Admin dashboards. Everything comes
 * from the Entries Report payload (campus-logged sessions, No Class markers and
 * missing-submission days), so the dashboard always matches /hr/reports.
 */
export function EntriesOverview({ leading }: Props) {
  const { accessToken } = useAppSelector((s) => s.auth)
  const now = new Date()
  const todayISO = toLocalISO(now)
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(todayISO)

  // Tagged with the requested range so a slow reply for an old range is never
  // shown as the current selection.
  const res = useAsyncResource<RangeData>(
    async () => ({ from, to, report: await getEntriesReport(from, to, accessToken!) }),
    [accessToken, from, to],
    { enabled: !!accessToken && !!from && !!to && from <= to },
  )

  const report = res.data && res.data.from === from && res.data.to === to ? res.data.report : null
  const loading = res.status === 'loading' || res.isRefetching || (!report && res.status !== 'error')
  const periodLabel = from === to ? fmtDay(from) : `${fmtDay(from)} – ${fmtDay(to)}`

  const view = useMemo(() => {
    if (!report) return null

    const byCampus = new Map<string, CampusRow>()
    for (const name of report.campuses) {
      byCampus.set(name, { campusName: name, entries: 0, hours: 0, noClassDays: 0, missingDays: [] })
    }
    const ensure = (name: string): CampusRow => {
      let row = byCampus.get(name)
      if (!row) {
        row = { campusName: name, entries: 0, hours: 0, noClassDays: 0, missingDays: [] }
        byCampus.set(name, row)
      }
      return row
    }

    const byFaculty = new Map<string, FacultyRow>()
    let totalHours = 0
    for (const s of report.sessions) {
      const c = ensure(s.campusName)
      c.entries += 1
      c.hours += s.durationHours
      totalHours += s.durationHours

      const f = byFaculty.get(s.facultyId) ?? { facultyId: s.facultyId, name: s.facultyName, entries: 0, hours: 0 }
      f.entries += 1
      f.hours += s.durationHours
      byFaculty.set(s.facultyId, f)
    }
    for (const n of report.noClass) {
      const c = ensure(n.campusName)
      c.noClassDays += 1
    }
    // Sundays are off days — never flag them as missing.
    for (const m of report.missing) {
      const row = ensure(m.campusName)
      row.missingDays = Array.from(new Set([...row.missingDays, ...m.dates.filter((d) => !isSunday(d))])).sort()
    }

    const campuses = Array.from(byCampus.values()).sort((a, b) => a.campusName.localeCompare(b.campusName))
    const faculty = Array.from(byFaculty.values()).sort((a, b) => b.hours - a.hours)
    const missingTotal = campuses.reduce((n, c) => n + c.missingDays.length, 0)
    return { campuses, faculty, totalHours, missingTotal }
  }, [report])

  const maxFacultyHours = view?.faculty[0]?.hours ?? 0
  const flagged = view?.campuses.filter((c) => c.missingDays.length > 0) ?? []

  const stats = [
    { label: 'Entries',          value: report ? report.sessions.length : '—',               tone: '' },
    { label: 'Faculty Teaching', value: view ? view.faculty.length : '—',                    tone: css.kpiOk },
    { label: 'No Class Days',    value: report ? report.noClass.length : '—',                tone: css.kpiInfo },
    { label: 'Unsubmitted Days', value: view ? view.missingTotal : '—',                      tone: view && view.missingTotal > 0 ? css.kpiBad : css.kpiMuted },
  ]

  return (
    <div className={css.root}>
      {leading}

      <PushBoardDay />

      <section className={css.section} aria-labelledby="overview-range">
        <div className={css.sectionHead}>
          <div>
            <h2 id="overview-range">Range overview</h2>
            <p className={css.sectionSub}>Entries · {periodLabel}</p>
          </div>
        </div>

        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          loading={loading}
          onApply={res.refetch}
          applyLabel="Refresh"
        />

        {res.status === 'error' && (
          <ErrorAlert
            message={res.error?.message ?? ''}
            what={`Couldn't load the ${periodLabel} overview`}
            onRetry={res.refetch}
          />
        )}

        <div aria-live="polite">
          {!report && res.status !== 'error' ? (
            <SkeletonStats count={4} />
          ) : (
            <div className="stats-grid">
              {stats.map(({ label, value, tone }) => (
                <div key={label} className="stat-card">
                  <div className="stat-label">{label}</div>
                  <div className={`stat-value ${tone}`}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {report?.truncated && (
          <p className={css.noteWarn}>
            This range has more entries than can be shown — narrow the dates for exact totals.
          </p>
        )}
      </section>

      {/* ── Unsubmitted days (red flags) ────────────────────────────────────── */}
      {view && flagged.length > 0 && (
        <section>
          <div className={`card ${css.alertCard}`}>
            <div className="card-header">
              <h2>Unsubmitted days</h2>
              <Link href="/hr/reports" className={css.link}>Open report <Icon name="chevronRight" size={12} /></Link>
            </div>
            <div className={css.flagList}>
              {flagged.map((c) => (
                <div key={c.campusName} className={css.flagRow}>
                  <strong>{c.campusName}</strong>
                  <span className="text-muted text-xs">
                    {c.missingDays.length} {c.missingDays.length === 1 ? 'day' : 'days'}
                  </span>
                  {c.missingDays.slice(0, 8).map((d) => (
                    <span key={d} className="badge badge-red">{fmtDay(d, false)}</span>
                  ))}
                  {c.missingDays.length > 8 && (
                    <span className={css.more}>+{c.missingDays.length - 8} more</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <SubjectHours />

      <div className="panel-grid-2">
        {/* ── Campus-wise ───────────────────────────────────────────────────── */}
        <div className={`card ${css.minw}`}>
          <div className="card-header">
            <h2>Campus-wise</h2>
            <Link href="/hr/reports" className={css.link}>Entries Report <Icon name="chevronRight" size={12} /></Link>
          </div>
          {!view ? (
            <SkeletonCard lines={4} showHeader={false} />
          ) : view.campuses.length === 0 ? (
            <EmptyState title="No campuses" description="Campuses appear here once entries are logged." />
          ) : (
            <div className="table-wrapper">
              <table className={css.tableMin}>
                <thead>
                  <tr>
                    <th>Campus</th>
                    <th className="num" style={{ textAlign: 'right' }}>Entries</th>
                    <th className="num" style={{ textAlign: 'right' }}>Hours</th>
                    <th className="num" style={{ textAlign: 'right' }}>Unsubmitted</th>
                  </tr>
                </thead>
                <tbody>
                  {view.campuses.map((c) => (
                    <tr key={c.campusName}>
                      <td className={css.cellStrong}>{c.campusName}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{c.entries}</td>
                      <td className={`num ${css.hoursStrong}`} style={{ textAlign: 'right' }}>{formatHM(c.hours)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {c.missingDays.length > 0
                          ? <span className="badge badge-red">{c.missingDays.length}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Faculty hours ─────────────────────────────────────────────────── */}
        <div className={`card ${css.minw}`}>
          <div className="card-header">
            <h2>Faculty Hours</h2>
            <Link href="/hr/reports/faculty-hours" className={css.link}>By subject <Icon name="chevronRight" size={12} /></Link>
          </div>
          {!view ? (
            <SkeletonCard lines={4} showHeader={false} />
          ) : view.faculty.length === 0 ? (
            <EmptyState title="No entries in this range" description="Hours taught will appear here once entries are submitted." />
          ) : (
            <div className={css.barList}>
              {view.faculty.slice(0, 10).map((f) => (
                <div key={f.facultyId}>
                  <div className={css.barTop}>
                    <span className={css.barName}>{f.name}</span>
                    <span className={`mono ${css.barFig}`}>
                      {formatHM(f.hours)} · {f.entries} {f.entries === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <div className={css.barTrack}>
                    <div className={css.barFill} style={{ width: `${maxFacultyHours > 0 ? (f.hours / maxFacultyHours) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {view.faculty.length > 10 && (
                <span className={css.more}>
                  Showing top 10 of {view.faculty.length} faculty
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
