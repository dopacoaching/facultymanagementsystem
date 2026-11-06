'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAppSelector } from '@/store/hooks'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { ErrorAlert, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { Icon } from '@/components/ui/Icon'
import rs from '@/components/hr/reports/Reports.module.css'
import { toLocalISO } from '@/utils/date'
import { FlagIcon, fmtDay, isSunday, monthRange } from '@/components/hr/reports/reportShared'

/** Past days where a campus pushed no entry and did not mark "No Class". */
export default function NotSubmittedPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo]     = useState(toLocalISO(now))
  const [report, setReport]   = useState<EntriesReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [campus, setCampus]   = useState('')
  const [skipSundays, setSkipSundays] = useState(false)

  /** Latest request wins — a slow earlier response must not overwrite newer data. */
  const requestId = useRef(0)

  async function load() {
    if (!accessToken || !from || !to) return
    if (from > to) { setError('The start date must not be after the end date.'); return }
    const id = ++requestId.current
    setLoading(true); setError('')
    try {
      const data = await getEntriesReport(from, to, accessToken, { missingOnly: true })
      if (id !== requestId.current) return
      setReport(data)
      // A campus picked earlier may not exist in this report — fall back to all campuses.
      setCampus((c) => (c && !data.campuses.includes(c) ? '' : c))
    } catch (e: unknown) {
      if (id !== requestId.current) return
      setError(e instanceof Error ? e.message : 'Failed to load the report')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }
  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Month picker drives the same from/to range as the date pickers. */
  function pickMonth(ym: string) {
    if (!ym) return
    const r = monthRange(ym, now)
    setFrom(r.from); setTo(r.to)
  }

  const missing = useMemo(() => {
    return (report?.missing ?? [])
      .filter((m) => !campus || m.campusName === campus)
      .map((m) => ({ ...m, dates: skipSundays ? m.dates.filter((d) => !isSunday(d)) : m.dates }))
      .filter((m) => m.dates.length > 0)
      .sort((a, b) => b.dates.length - a.dates.length || a.campusName.localeCompare(b.campusName))
  }, [report, campus, skipSundays])

  const totalMissingDays = missing.reduce((n, m) => n + m.dates.length, 0)
  const noClassCount = (report?.noClass ?? []).filter((n) => !campus || n.campusName === campus).length

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Reports Not Submitted</h1>
          <p className="page-subtitle">
            Past days where a campus pushed no entry and did not mark &ldquo;No Class&rdquo; — <span className="mono">{fmtDay(from)}</span> to <span className="mono">{fmtDay(to)}</span>.
          </p>
        </div>
        <div className="page-head-actions">
          <Link href="/hr/reports" className="btn btn-outline"><Icon name="report" size={16} /> Entries Report</Link>
        </div>
      </div>

      {error && <div style={{ marginBottom: 'var(--space-4)' }}><ErrorAlert message={error} onRetry={load} /></div>}

      {report && (
        <div className={`stats-grid ${rs.kpis}`} aria-live="polite">
          <div className="stat-card">
            <div className="stat-label">Campuses flagged</div>
            <div className="stat-value">{missing.length}</div>
            <div className="stat-sub">{missing.length > 0 ? 'flagged: reports missing' : 'nothing missing'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Days missing</div>
            <div className="stat-value">{totalMissingDays}</div>
            <div className="stat-sub">{skipSundays ? 'Sundays ignored' : 'including Sundays'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">No Class marked</div>
            <div className="stat-value">{noClassCount}</div>
            <div className="stat-sub">in this range</div>
          </div>
        </div>
      )}

      <div className={rs.filters}>
        <div className={rs.filterRow}>
          <div className={`form-group ${rs.field}`}>
            <label className="label" htmlFor="ns-month">Month</label>
            <input id="ns-month" type="month" className="input" max={toLocalISO(now).slice(0, 7)}
              value={from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : ''}
              onChange={(e) => pickMonth(e.target.value)} />
          </div>
          <div className={`form-group ${rs.fieldWide}`}>
            <label className="label" htmlFor="ns-campus">Campus</label>
            <select id="ns-campus" className="input" value={campus} onChange={(e) => setCampus(e.target.value)}>
              <option value="">All campuses</option>
              {(report?.campuses ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label className={rs.check}>
            <input type="checkbox" checked={skipSundays} onChange={(e) => setSkipSundays(e.target.checked)} />
            Ignore Sundays
          </label>
        </div>
        <div className={rs.filterRow}>
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
        </div>
      </div>

      {loading && !report && <div className="card card-flush"><SkeletonTable rows={4} cols={3} /></div>}

      {report && (
        <div className={`card ${missing.length ? rs.alertCard : ''}`}>
          <div className={rs.flagHead}>
            <h2 className={`${rs.flagTitle} ${missing.length ? rs.flagTitleBad : ''}`}>
              {missing.length > 0 && <FlagIcon />}
              {missing.length > 0
                ? `${missing.length} ${missing.length === 1 ? 'campus' : 'campuses'} · ${totalMissingDays} ${totalMissingDays === 1 ? 'day' : 'days'} missing`
                : 'Nothing missing'}
            </h2>
            {noClassCount > 0 && (
              <span className="badge badge-gray">
                <Icon name="ban" size={12} /> {noClassCount} No Class {noClassCount === 1 ? 'day' : 'days'} marked in this range
              </span>
            )}
          </div>
          {missing.length === 0 ? (
            <div className="alert alert-success" style={{ margin: 0 }}>
              <span className="alert-icon"><Icon name="check" size={16} /></span>
              Every campus has submitted for all past days in this range.
            </div>
          ) : (
            <ul className={rs.flagList}>
              {missing.map((m) => (
                <li key={`${m.campusName}|${m.batchName ?? ''}`} className={rs.flagItem}>
                  <span style={{ paddingTop: 2 }}><FlagIcon /></span>
                  <div className={rs.flagBody}>
                    <div>
                      <span className={rs.flagName}>{m.campusName}{m.batchName ? ` · ${m.batchName}` : ''}</span>
                      <span className="badge badge-red" style={{ marginLeft: 'var(--space-2)' }}>
                        Not submitted · {m.dates.length} {m.dates.length === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                    <div className={rs.flagDates}>
                      {m.dates.map((d) => <span key={d} className={`badge ${rs.flagDate}`}>{fmtDay(d)}</span>)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
