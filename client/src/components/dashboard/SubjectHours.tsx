'use client'
import { useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getEntriesReport, type EntriesReport } from '@/services/entries.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert, EmptyState, SkeletonCard } from '@/components/ui/Skeleton'
import { toLocalISO } from '@/utils/date'

interface MonthData {
  month: string
  report: EntriesReport
}

function formatHM(hours: number): string {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** 'YYYY-MM' → first and last day as YYYY-MM-DD. */
function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  return { from: toLocalISO(new Date(y, m - 1, 1)), to: toLocalISO(new Date(y, m, 0)) }
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Hours taught per subject for one chosen month. Has its own month picker and
 * its own fetch, independent of the dashboard's date range.
 */
export function SubjectHours() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const thisMonth = toLocalISO(new Date()).slice(0, 7)
  const [month, setMonth] = useState(thisMonth)
  const valid = /^\d{4}-\d{2}$/.test(month) && month <= thisMonth

  const res = useAsyncResource<MonthData>(
    async () => {
      const { from, to } = monthRange(month)
      return { month, report: await getEntriesReport(from, to, accessToken!) }
    },
    [accessToken, month],
    { enabled: !!accessToken && valid },
  )
  const report = res.data && res.data.month === month ? res.data.report : null

  const view = useMemo(() => {
    if (!report) return null
    const bySubject = new Map<string, { subject: string; entries: number; hours: number }>()
    let total = 0
    for (const s of report.sessions) {
      const subject = s.subject?.trim() || 'Unspecified'
      const row = bySubject.get(subject) ?? { subject, entries: 0, hours: 0 }
      row.entries += 1
      row.hours += s.durationHours
      bySubject.set(subject, row)
      total += s.durationHours
    }
    return { subjects: Array.from(bySubject.values()).sort((a, b) => b.hours - a.hours), total }
  }, [report])

  const max = view?.subjects[0]?.hours ?? 0

  return (
    <div className="card" style={{ minWidth: 0 }}>
      <div className="card-header" style={{ flexWrap: 'wrap' }}>
        <div>
          <h2>Hours by Subject</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
            {monthLabel(month)}{view ? ` · ${formatHM(view.total)} total` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹ Prev</button>
          <input
            type="month"
            className="input"
            style={{ width: 'auto' }}
            aria-label="Month"
            value={month}
            max={thisMonth}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
          <button type="button" className="btn btn-ghost" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Next month">Next ›</button>
        </div>
      </div>

      {res.status === 'error' && (
        <ErrorAlert message={res.error?.message ?? ''} what={`Couldn't load ${monthLabel(month)}`} onRetry={res.refetch} />
      )}

      {!view && res.status !== 'error' ? (
        <SkeletonCard lines={4} showHeader={false} />
      ) : view && view.subjects.length === 0 ? (
        <EmptyState title="No entries this month" description="Hours by subject will appear here once entries are submitted." />
      ) : view && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.875rem 2rem', opacity: res.isRefetching ? 0.6 : 1 }}>
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
                  width: `${max > 0 ? (sub.hours / max) * 100 : 0}%`,
                  background: 'var(--color-primary)',
                  borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
