'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAppSelector } from '@/store/hooks'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert, EmptyState, SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { toLocalISO } from '@/utils/date'
import { PushBoardDay } from './PushBoardDay'

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

const linkStyle = { fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' } as const

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

interface SubjectRow {
  subject: string
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
    const bySubject = new Map<string, SubjectRow>()
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

      const subject = s.subject?.trim() || 'Unspecified'
      const sub = bySubject.get(subject) ?? { subject, entries: 0, hours: 0 }
      sub.entries += 1
      sub.hours += s.durationHours
      bySubject.set(subject, sub)
    }
    for (const n of report.noClass) {
      const c = ensure(n.campusName)
      c.noClassDays += 1
    }
    // Sundays are off days — never flag them as missing.
    for (const m of report.missing) {
      ensure(m.campusName).missingDays = m.dates.filter((d) => !isSunday(d))
    }

    const campuses = Array.from(byCampus.values()).sort((a, b) => a.campusName.localeCompare(b.campusName))
    const faculty = Array.from(byFaculty.values()).sort((a, b) => b.hours - a.hours)
    const subjects = Array.from(bySubject.values()).sort((a, b) => b.hours - a.hours)
    const missingTotal = campuses.reduce((n, c) => n + c.missingDays.length, 0)
    return { campuses, faculty, subjects, totalHours, missingTotal }
  }, [report])

  const maxFacultyHours = view?.faculty[0]?.hours ?? 0
  const maxSubjectHours = view?.subjects[0]?.hours ?? 0
  const flagged = view?.campuses.filter((c) => c.missingDays.length > 0) ?? []

  const stats = [
    { label: 'Entries',          value: report ? report.sessions.length : '—',               color: 'var(--color-text)' },
    { label: 'Faculty Teaching', value: view ? view.faculty.length : '—',                    color: 'var(--color-success)' },
    { label: 'No Class Days',    value: report ? report.noClass.length : '—',                color: 'var(--color-info)' },
    { label: 'Unsubmitted Days', value: view ? view.missingTotal : '—',                      color: view && view.missingTotal > 0 ? 'var(--color-danger)' : 'var(--color-muted)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <PushBoardDay />

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

      {leading}

      <section>
        <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>Entries · {periodLabel}</h2>
        {!report && res.status !== 'error' ? (
          <SkeletonStats count={4} />
        ) : (
          <div className="stat-strip">
            {stats.map(({ label, value, color }) => (
              <div key={label} className="stat-card">
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        )}
        {report?.truncated && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning-fg)', marginTop: '0.75rem' }}>
            This range has more entries than can be shown — narrow the dates for exact totals.
          </p>
        )}
      </section>

      {/* ── Unsubmitted days (red flags) ────────────────────────────────────── */}
      {view && flagged.length > 0 && (
        <section>
          <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
            <div className="card-header">
              <h2 style={{ color: 'var(--color-danger)' }}>Unsubmitted days</h2>
              <Link href="/hr/reports" style={linkStyle}>Open report →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {flagged.map((c) => (
                <div key={c.campusName} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.875rem', minWidth: 120 }}>{c.campusName}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {c.missingDays.length} {c.missingDays.length === 1 ? 'day' : 'days'}
                  </span>
                  {c.missingDays.slice(0, 8).map((d) => (
                    <span key={d} className="badge badge-red">{fmtDay(d, false)}</span>
                  ))}
                  {c.missingDays.length > 8 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>+{c.missingDays.length - 8} more</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Hours by subject ─────────────────────────────────────────────────── */}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="card-header">
          <h2>Hours by Subject</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
            {view ? `${formatHM(view.totalHours)} total` : ''}
          </span>
        </div>
        {!view ? (
          <SkeletonCard lines={4} showHeader={false} />
        ) : view.subjects.length === 0 ? (
          <EmptyState title="No entries in this range" description="Hours by subject will appear here once entries are submitted." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.875rem 2rem' }}>
            {view.subjects.map((sub) => (
              <div key={sub.subject}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.subject}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {formatHM(sub.hours)} · {sub.entries} {sub.entries === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${maxSubjectHours > 0 ? (sub.hours / maxSubjectHours) * 100 : 0}%`,
                    background: 'var(--color-primary)',
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-grid-2">
        {/* ── Campus-wise ───────────────────────────────────────────────────── */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h2>Campus-wise</h2>
            <Link href="/hr/reports" style={linkStyle}>Entries Report →</Link>
          </div>
          {!view ? (
            <SkeletonCard lines={4} showHeader={false} />
          ) : view.campuses.length === 0 ? (
            <EmptyState title="No campuses" description="Campuses appear here once entries are logged." />
          ) : (
            <div className="table-wrapper">
              <table style={{ minWidth: 360 }}>
                <thead>
                  <tr>
                    <th>Campus</th>
                    <th style={{ textAlign: 'right' }}>Entries</th>
                    <th style={{ textAlign: 'right' }}>Hours</th>
                    <th style={{ textAlign: 'right' }}>Unsubmitted</th>
                  </tr>
                </thead>
                <tbody>
                  {view.campuses.map((c) => (
                    <tr key={c.campusName}>
                      <td style={{ fontWeight: 600 }}>{c.campusName}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.entries}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--color-primary)' }}>{formatHM(c.hours)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {c.missingDays.length > 0
                          ? <span className="badge badge-red">{c.missingDays.length}</span>
                          : <span style={{ color: 'var(--color-muted)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Faculty hours ─────────────────────────────────────────────────── */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h2>Faculty Hours</h2>
            <Link href="/hr/reports/faculty-hours" style={linkStyle}>By subject →</Link>
          </div>
          {!view ? (
            <SkeletonCard lines={4} showHeader={false} />
          ) : view.faculty.length === 0 ? (
            <EmptyState title="No entries in this range" description="Hours taught will appear here once entries are submitted." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {view.faculty.slice(0, 10).map((f) => (
                <div key={f.facultyId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {formatHM(f.hours)} · {f.entries} {f.entries === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${maxFacultyHours > 0 ? (f.hours / maxFacultyHours) * 100 : 0}%`,
                      background: 'var(--color-primary)',
                      borderRadius: 3,
                    }} />
                  </div>
                </div>
              ))}
              {view.faculty.length > 10 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
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
