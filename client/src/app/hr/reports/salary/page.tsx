'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getReports } from '@/services/salary.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import {
  ReportRow, exportToCSV, ReportsSummaryStats, ReportsTable,
} from '@/components/hr/reports'
import { toLocalISO } from '@/utils/date'
import { Icon } from '@/components/ui/Icon'
import { SalaryOnHold } from '@/components/ui/SalaryOnHold'
import { SALARY_ENABLED, SALARY_TEMPORARY_ENABLED, SALARY_LABELS } from '@/lib/constants/features'

function ReportsPageInner() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [rows, setRows] = useState<ReportRow[]>([])
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(toLocalISO(now))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!accessToken || !from || !to) return
    setLoading(true); setError('')
    try {
      const data = await getReports(from, to, accessToken)
      setRows(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load reports')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = rows.reduce((sum, r) => sum + (r.finalPayable ?? 0), 0)
  const periodLabel = `${from} to ${to}`

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{SALARY_LABELS.reports}</h1>
          <p className="page-subtitle">
            {rows.length} approved {rows.length === 1 ? 'record' : 'records'} — {periodLabel}
          </p>
        </div>
        <div className="page-head-actions">
          {rows.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={() => exportToCSV(rows, from, to)} title="Export as CSV">
              <Icon name="download" size={16} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      <div className="stack">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />

        <ReportsSummaryStats count={rows.length} total={total} periodLabel={periodLabel} />

        <div aria-live="polite">
          <ReportsTable loading={loading} rows={rows} total={total} periodLabel={periodLabel} />
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return SALARY_ENABLED || SALARY_TEMPORARY_ENABLED ? <ReportsPageInner /> : <SalaryOnHold />
}
