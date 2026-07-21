'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getReports } from '@/services/salary.service'
import { ErrorAlert } from '@/components/ui/Skeleton'
import {
  ReportRow, MONTHS, exportToCSV, ReportsFilterBar, ReportsSummaryStats, ReportsTable,
} from '@/components/hr/reports'

export default function ReportsPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!accessToken) return
    setLoading(true); setError('')
    try {
      const data = await getReports(month, year, accessToken)
      setRows(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load reports')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [accessToken, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = rows.reduce((sum, r) => sum + (r.finalPayable ?? 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Salary Reports</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {rows.length} approved {rows.length === 1 ? 'record' : 'records'} — {MONTHS[month - 1]} {year}
          </p>
        </div>
        {rows.length > 0 && (
          <button className="btn btn-ghost" onClick={() => exportToCSV(rows, month, year)} title="Export as CSV">
            ↓ Export CSV
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorAlert message={error} onRetry={load} />
        </div>
      )}

      <ReportsFilterBar month={month} onMonthChange={setMonth} year={year} onYearChange={setYear} loading={loading} onRefresh={load} />

      <ReportsSummaryStats count={rows.length} total={total} month={month} year={year} />

      <ReportsTable loading={loading} rows={rows} total={total} month={month} year={year} />
    </div>
  )
}
