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

export default function ReportsPage() {
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
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Salary Reports</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {rows.length} approved {rows.length === 1 ? 'record' : 'records'} — {periodLabel}
          </p>
        </div>
        {rows.length > 0 && (
          <button type="button" className="btn btn-outline" onClick={() => exportToCSV(rows, from, to)} title="Export as CSV">
            Export CSV
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
      </div>

      <ReportsSummaryStats count={rows.length} total={total} periodLabel={periodLabel} />

      <ReportsTable loading={loading} rows={rows} total={total} periodLabel={periodLabel} />
    </div>
  )
}
