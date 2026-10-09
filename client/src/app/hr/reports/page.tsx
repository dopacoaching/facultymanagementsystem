'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getEntriesReport, type EntriesReport, type EntryRow } from '@/services/entries.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { useToast } from '@/components/ui/Toast'
import { toLocalISO } from '@/utils/date'

type FacultyKind = 'PERMANENT' | 'TEMPORARY' | 'ALL'
type GroupBy = 'campus' | 'subject' | 'faculty'

const KIND_TABS: { key: FacultyKind; label: string }[] = [
  { key: 'PERMANENT', label: 'Permanent faculty' },
  { key: 'TEMPORARY', label: 'Temporary faculty' },
  { key: 'ALL',       label: 'All faculty' },
]
const GROUP_TABS: { key: GroupBy; label: string }[] = [
  { key: 'campus',  label: 'Campus-wise' },
  { key: 'subject', label: 'Subject-wise' },
  { key: 'faculty', label: 'Faculty-wise' },
]

function formatHM(hours: number): string {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isSunday(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 0
}

/** Sessions → { key → rows } keeping insertion order of the sorted input. */
function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    const list = map.get(k)
    if (list) list.push(r); else map.set(k, [r])
  }
  return map
}

const MODE_LABELS: Record<string, string> = {
  ONLINE: 'Online', OFFLINE: 'Offline',
  ONLINE_DOUBT_CLEARANCE: 'Online Doubt Clearance', OFFLINE_DOUBT_CLEARANCE: 'Offline Doubt Clearance',
}

/** Total break minutes across the morning/lunch/afternoon fields, or null if none was recorded. */
function breakTotal(r: EntryRow): number | null {
  const parts = [r.breakMinutes, r.lunchBreakMinutes, r.afternoonBreakMinutes]
  return parts.every((p) => p == null) ? null : parts.reduce<number>((t, p) => t + (p ?? 0), 0)
}
const breakLabel = (r: EntryRow) => { const t = breakTotal(r); return t == null ? '—' : t === 0 ? 'Nil' : `${t}m` }

const sumHours = (rows: EntryRow[]) => rows.reduce((t, r) => t + r.durationHours, 0)

function EntryTable({ rows, hideCols, showBatch }: { rows: EntryRow[]; hideCols?: ('campus' | 'faculty' | 'subject')[]; showBatch: boolean }) {
  const showCampus = !hideCols?.includes('campus')
  const showFaculty = !hideCols?.includes('faculty')
  const showSubject = !hideCols?.includes('subject')
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            {showCampus && <th>Campus</th>}
            {showBatch && <th>Batch</th>}
            {showFaculty && <th>Faculty</th>}
            {showSubject && <th>Subject</th>}
            <th>Chapter</th>
            <th>Class mode</th>
            <th>Start–End</th>
            <th style={{ textAlign: 'right' }} title="Break minutes as entered. For the tea break, the first 15 minutes are free of deduction.">Break</th>
            <th>Entered by</th>
            <th style={{ textAlign: 'right' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{fmtDay(r.date)}</td>
              {showCampus && <td style={{ color: 'var(--color-text-secondary)' }}>{r.campusName}</td>}
              {showBatch && <td style={{ color: 'var(--color-text-secondary)' }}>{r.batchName || '—'}</td>}
              {showFaculty && <td style={{ fontWeight: 600 }}>{r.facultyName}</td>}
              {showSubject && <td style={{ color: 'var(--color-text-secondary)' }}>{r.subject}</td>}
              <td style={{ color: 'var(--color-text-secondary)' }}>{r.chapter || '—'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{r.classMode ? MODE_LABELS[r.classMode] ?? r.classMode : '—'}</td>
              <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.startTime || '—'}–{r.endTime || '—'}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{breakLabel(r)}</td>
              <td style={{ color: 'var(--color-text-secondary)' }}>{r.updatedByName || '—'}</td>
              <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatHM(r.durationHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupHeader({ title, count, hours, level = 1 }: { title: string; count: number; hours: number; level?: 1 | 2 }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem',
      padding: level === 1 ? '0 0 0.5rem' : '0.75rem 0 0.375rem',
    }}>
      {level === 1 ? <h3 style={{ margin: 0 }}>{title}</h3> : <h4 style={{ margin: 0 }}>{title}</h4>}
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
        {count} {count === 1 ? 'entry' : 'entries'} ·{' '}
        <strong style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{formatHM(hours)}</strong>
      </span>
    </div>
  )
}

function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M5 3a1 1 0 0 1 1 1v1h12.5a.5.5 0 0 1 .4.8L16.5 9l2.4 3.2a.5.5 0 0 1-.4.8H6v8a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1z" />
    </svg>
  )
}

/** Tab-separated text for the current view, ready to paste into a sheet. */
function toTSV(rows: EntryRow[]): string {
  const head = ['Date', 'Campus', 'Batch', 'Faculty', 'Faculty type', 'Subject', 'Chapter', 'Class mode', 'Start', 'End', 'Break (min)', 'Entered by', 'Time (h:mm)', 'Hours']
  // Neutralise spreadsheet formulas (=, +, -, @) in coordinator-typed text.
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, ' ').replace(/^[=+\-@]/, "'$&")
  const lines = rows.map((r) => {
    const mins = Math.round(r.durationHours * 60)
    return [
      r.date, r.campusName, r.batchName, r.facultyName, r.facultyType, r.subject, r.chapter,
      r.classMode ? MODE_LABELS[r.classMode] ?? r.classMode : '', r.startTime, r.endTime, breakTotal(r) ?? '', r.updatedByName,
      `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`, r.durationHours.toFixed(2),
    ].map((v) => clean(String(v))).join('\t')
  })
  return [head.join('\t'), ...lines].join('\n')
}

export default function EntriesReportPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo]     = useState(toLocalISO(now))
  const [report, setReport]   = useState<EntriesReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [kind, setKind]       = useState<FacultyKind>('PERMANENT')
  const [group, setGroup]     = useState<GroupBy>('campus')
  const [campus, setCampus]   = useState('')
  const [skipSundays, setSkipSundays] = useState(false)

  const canCopy = role === 'ADMIN'

  async function load() {
    if (!accessToken || !from || !to) return
    setLoading(true); setError('')
    try {
      setReport(await getEntriesReport(from, to, accessToken))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load the report')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Month picker drives the same from/to range as the date pickers. */
  function pickMonth(ym: string) {
    if (!ym) return
    const [y, m] = ym.split('-').map(Number)
    const last = new Date(y, m, 0)
    const end = last > now ? now : last
    setFrom(toLocalISO(new Date(y, m - 1, 1)))
    setTo(toLocalISO(end))
  }

  const rows = useMemo(() => {
    const all = report?.sessions ?? []
    return all
      .filter((r) => kind === 'ALL' || (kind === 'PERMANENT') === (r.facultyType === 'PERMANENT'))
      .filter((r) => !campus || r.campusName === campus)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  }, [report, kind, campus])

  const byCampus = useMemo(() => {
    const map = groupBy(rows, (r) => r.campusName)
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  // Decided once from the whole filtered set so every table shares the same columns.
  const showBatch = useMemo(() => rows.some((r) => r.batchName), [rows])

  const byFaculty = useMemo(() => {
    if (group !== 'faculty') return []
    const map = groupBy(rows, (r) => r.facultyId)
    return Array.from(map.entries()).sort(([, a], [, b]) => a[0].facultyName.localeCompare(b[0].facultyName))
  }, [rows, group])

  const missing = useMemo(() => {
    return (report?.missing ?? [])
      .filter((m) => !campus || m.campusName === campus)
      .map((m) => ({ ...m, dates: skipSundays ? m.dates.filter((d) => !isSunday(d)) : m.dates }))
      .filter((m) => m.dates.length > 0)
  }, [report, campus, skipSundays])

  const noClassCount = (report?.noClass ?? []).filter((n) => !campus || n.campusName === campus).length

  async function copyData() {
    try {
      await navigator.clipboard.writeText(toTSV(rows))
      toast.success('Copied', `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'} copied — paste into a sheet.`)
    } catch {
      toast.error('Copy failed', 'Your browser blocked clipboard access.')
    }
  }

  const kindLabel = KIND_TABS.find((t) => t.key === kind)!.label.toLowerCase()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Entries Report</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Sessions pushed by each campus — {fmtDay(from)} to {fmtDay(to)}.
          </p>
        </div>
        {canCopy && rows.length > 0 && (
          <button type="button" className="btn btn-outline" onClick={copyData} title="Copy the entries below as tab-separated text">
            Copy data
          </button>
        )}
      </div>

      {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} onRetry={load} /></div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="er-month">Month</label>
            <input id="er-month" type="month" className="input" max={toLocalISO(now).slice(0, 7)}
              value={from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : ''}
              onChange={(e) => pickMonth(e.target.value)} style={{ minWidth: 150 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="er-campus">Campus</label>
            <select id="er-campus" className="input" value={campus} onChange={(e) => setCampus(e.target.value)} style={{ minWidth: 190 }}>
              <option value="">All campuses</option>
              {(report?.campuses ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
      </div>

      {/* ── Not submitted ─────────────────────────────────────────────── */}
      {report && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: missing.length ? 'var(--color-danger)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: missing.length ? 'var(--color-danger)' : undefined }}>
              {missing.length > 0 && <FlagIcon />}
              Reports not submitted
            </h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
              <input type="checkbox" checked={skipSundays} onChange={(e) => setSkipSundays(e.target.checked)} />
              Ignore Sundays
            </label>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', margin: '0.25rem 0 0.75rem' }}>
            Past days where a campus pushed no entry and did not mark &ldquo;No Class&rdquo;.
            {noClassCount > 0 && ` ${noClassCount} No Class ${noClassCount === 1 ? 'day' : 'days'} marked in this range.`}
          </p>
          {missing.length === 0 ? (
            <div className="alert alert-success" style={{ margin: 0 }}>Every campus has submitted for all past days in this range.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {missing.map((m) => (
                <div key={m.campusName} style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.5rem 0.75rem',
                  background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)', borderRadius: 'var(--radius)',
                }}>
                  <span style={{ paddingTop: 2 }}><FlagIcon /></span>
                  <div style={{ fontSize: '0.875rem' }}>
                    <strong>{m.campusName}</strong>
                    <span style={{ marginLeft: '0.5rem' }}>{m.dates.length} {m.dates.length === 1 ? 'day' : 'days'} missing</span>
                    <div style={{ fontSize: '0.8125rem', marginTop: 2 }}>
                      {m.dates.map((d) => fmtDay(d)).join(' · ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── View switches ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {KIND_TABS.map((t) => (
            <button key={t.key} type="button" className={`btn btn-sm ${kind === t.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setKind(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {GROUP_TABS.map((t) => (
            <button key={t.key} type="button" className={`btn btn-sm ${group === t.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setGroup(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {report?.truncated && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          This range has more entries than can be shown. Narrow the dates to see everything.
        </div>
      )}

      {loading && !report ? (
        <div className="card"><SkeletonTable rows={8} cols={6} /></div>
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState title="No entries" description={`No ${kindLabel} entries for ${campus || 'any campus'} between ${fmtDay(from)} and ${fmtDay(to)}.`} />
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: '0 0 0.75rem' }}>
            {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · <strong style={{ color: 'var(--color-text)' }}>{formatHM(sumHours(rows))}</strong> in total
          </p>
          {group === 'faculty' && byFaculty.map(([facultyId, list]) => (
            // Faculty-wise: one block per faculty with all their sessions, across every campus and batch.
            <div key={facultyId} className="card" style={{ marginBottom: '1rem' }}>
              <GroupHeader
                title={`${list[0].facultyName} · ${list[0].facultyType.charAt(0) + list[0].facultyType.slice(1).toLowerCase()} · ${list[0].subject}`}
                count={list.length}
                hours={sumHours(list)}
              />
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', margin: '0 0 0.75rem' }}>
                {Array.from(groupBy(list, (r) => r.campusName).entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([campusName, campusList]) => (
                    <span key={campusName} className="badge badge-gray">
                      {campusName}: {campusList.length} · {formatHM(sumHours(campusList))}
                    </span>
                  ))}
              </div>
              <EntryTable rows={list} hideCols={['faculty']} showBatch={showBatch} />
            </div>
          ))}

          {group !== 'faculty' && byCampus.map(([campusName, campusRows]) => (
            <div key={campusName} className="card" style={{ marginBottom: '1rem' }}>
              <GroupHeader title={campusName} count={campusRows.length} hours={sumHours(campusRows)} />

              {group === 'campus' && <EntryTable rows={campusRows} hideCols={['campus']} showBatch={showBatch} />}

              {group === 'subject' && Array.from(groupBy(campusRows, (r) => r.subject).entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([subject, list]) => (
                  <div key={subject}>
                    <GroupHeader title={subject} count={list.length} hours={sumHours(list)} level={2} />
                    <EntryTable rows={list} hideCols={['campus', 'subject']} showBatch={showBatch} />
                  </div>
                ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
