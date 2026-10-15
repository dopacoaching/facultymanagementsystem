'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAppSelector } from '@/store/hooks'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { toLocalISO } from '@/utils/date'

function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isSunday(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 0
}

function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M5 3a1 1 0 0 1 1 1v1h12.5a.5.5 0 0 1 .4.8L16.5 9l2.4 3.2a.5.5 0 0 1-.4.8H6v8a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1z" />
    </svg>
  )
}

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
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Reports Not Submitted</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Past days where a campus pushed no entry and did not mark &ldquo;No Class&rdquo; — {fmtDay(from)} to {fmtDay(to)}.
          </p>
        </div>
        <Link href="/hr/reports" className="btn btn-outline">Entries Report</Link>
      </div>

      {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} onRetry={load} /></div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="ns-month">Month</label>
            <input id="ns-month" type="month" className="input" max={toLocalISO(now).slice(0, 7)}
              value={from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : ''}
              onChange={(e) => pickMonth(e.target.value)} style={{ minWidth: 150 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="ns-campus">Campus</label>
            <select id="ns-campus" className="input" value={campus} onChange={(e) => setCampus(e.target.value)} style={{ minWidth: 190 }}>
              <option value="">All campuses</option>
              {(report?.campuses ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-muted)', paddingBottom: '0.625rem' }}>
            <input type="checkbox" checked={skipSundays} onChange={(e) => setSkipSundays(e.target.checked)} />
            Ignore Sundays
          </label>
        </div>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
      </div>

      {report && (
        <div className="card" style={{ borderColor: missing.length ? 'var(--color-danger)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: missing.length ? 'var(--color-danger)' : undefined }}>
              {missing.length > 0 && <FlagIcon />}
              {missing.length > 0
                ? `${missing.length} ${missing.length === 1 ? 'campus' : 'campuses'} · ${totalMissingDays} ${totalMissingDays === 1 ? 'day' : 'days'} missing`
                : 'Nothing missing'}
            </h3>
            {noClassCount > 0 && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                {noClassCount} No Class {noClassCount === 1 ? 'day' : 'days'} marked in this range
              </span>
            )}
          </div>
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
    </div>
  )
}
