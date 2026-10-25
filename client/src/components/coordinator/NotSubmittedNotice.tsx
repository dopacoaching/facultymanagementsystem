'use client'
import { useEffect, useMemo, useState } from 'react'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { FlagIcon, fmtDay } from '@/components/hr/reports/reportShared'
import { toLocalISO } from '@/utils/date'

const LOOKBACK_DAYS = 30

/** Push Board notice: past days (last 30, today excluded) where this campus pushed nothing and
 *  marked no "No Class". Campuses with several batches list each batch that is missing. */
export function NotSubmittedNotice({ accessToken, refreshKey }: { accessToken: string; refreshKey?: number }) {
  const [report, setReport] = useState<EntriesReport | null>(null)

  useEffect(() => {
    const now = new Date()
    const from = toLocalISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - LOOKBACK_DAYS))
    let cancelled = false
    getEntriesReport(from, toLocalISO(now), accessToken, { missingOnly: true })
      .then((r) => { if (!cancelled) setReport(r) })
      .catch(() => { if (!cancelled) setReport(null) })
    return () => { cancelled = true }
  }, [accessToken, refreshKey])

  const missing = useMemo(
    () => (report?.missing ?? []).filter((m) => m.dates.length > 0),
    [report],
  )
  const total = missing.reduce((n, m) => n + m.dates.length, 0)
  if (missing.length === 0) return null

  return (
    <div className="alert alert-error" role="alert" style={{ display: 'block', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        <FlagIcon />
        {total} {total === 1 ? 'day' : 'days'} not submitted
      </div>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem' }}>
        Push these classes, or mark No Class for the day, using the form below (pick the date).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {missing.map((m) => (
          <div key={`${m.campusName}|${m.batchName ?? ''}`} style={{ fontSize: '0.8125rem' }}>
            {m.batchName && <strong>{m.batchName}: </strong>}
            {m.dates.map(fmtDay).join(', ')}
          </div>
        ))}
      </div>
    </div>
  )
}
