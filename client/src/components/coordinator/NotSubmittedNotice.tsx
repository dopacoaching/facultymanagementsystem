'use client'
import { useEffect, useMemo, useState } from 'react'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { FlagIcon, fmtDay } from '@/components/hr/reports/reportShared'
import { toLocalISO } from '@/utils/date'
import s from './Entry.module.css'

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
    <div className={`alert alert-error ${s.notice}`} role="alert">
      <div className={s.noticeHead}>
        <FlagIcon />
        {total} {total === 1 ? 'day' : 'days'} not submitted
      </div>
      <p className={s.noticeText}>
        Push these classes, or mark No Class for the day, using the form below (pick the date).
      </p>
      <ul className={s.noticeList}>
        {missing.map((m) => (
          <li key={`${m.campusName}|${m.batchName ?? ''}`}>
            {m.batchName && <strong>{m.batchName}: </strong>}
            <span className={s.noticeDates}>{m.dates.map(fmtDay).join(', ')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
