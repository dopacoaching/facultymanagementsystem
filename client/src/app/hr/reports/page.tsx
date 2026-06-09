'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getReports } from '@/services/salary.service'
import { SkeletonTable, ErrorAlert, EmptyState } from '@/components/ui/Skeleton'

interface ReportRow {
  facultyId: string
  name: string
  subject: string
  month: number
  year: number
  finalPayable: number
  status: string
  approvedAt: string
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function exportToCSV(rows: ReportRow[], month: number, year: number) {
  if (!rows.length) return
  const headers = ['Faculty', 'Subject', 'Period', 'Final Payable (₹)', 'Status', 'Approved At']
  const csvRows = rows.map((r) => [
    `"${r.name}"`,
    `"${r.subject}"`,
    `"${MONTHS[r.month - 1]} ${r.year}"`,
    r.finalPayable ?? 0,
    r.status,
    `"${new Date(r.approvedAt).toLocaleString('en-IN')}"`,
  ])
  // Total row
  const total = rows.reduce((sum, r) => sum + (r.finalPayable ?? 0), 0)
  csvRows.push([`"Total Payroll — ${MONTHS[month - 1]} ${year}"`, '', '', total, '', ''])

  const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `salary-report-${MONTHS[month - 1].toLowerCase()}-${year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

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

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group">
            <label className="label">Month</label>
            <select className="input" value={month} onChange={(e) => setMonth(+e.target.value)} style={{ minWidth: 100 }}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Year</label>
            <input type="number" className="input" value={year} onChange={(e) => setYear(+e.target.value)} style={{ width: 100 }} />
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading} style={{ alignSelf: 'flex-end' }}>
            {loading ? <><span className="spinner" /> Loading…</> : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Summary stat */}
      {rows.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Approved Salaries</div>
            <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{rows.length}</div>
            <div className="stat-sub">{MONTHS[month - 1]} {year}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Payable</div>
            <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.5rem' }}>
              ₹{total.toLocaleString('en-IN')}
            </div>
            <div className="stat-sub">{MONTHS[month - 1]} {year}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No approved salaries"
            description={`No salaries have been approved for ${MONTHS[month - 1]} ${year}. Calculate and approve salaries from the Salary Calculator.`}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Subject</th>
                  <th>Period</th>
                  <th style={{ textAlign: 'right' }}>Final Payable</th>
                  <th>Status</th>
                  <th>Approved At</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{r.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{MONTHS[r.month - 1]} {r.year}</td>
                    <td style={{ fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{r.finalPayable?.toLocaleString('en-IN')}
                    </td>
                    <td><span className="badge badge-green">{r.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(r.approvedAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr style={{ background: 'rgba(79,70,229,.04)' }}>
                    <td colSpan={3} style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      Total Payroll — {MONTHS[month - 1]} {year}
                    </td>
                    <td style={{ fontWeight: 800, textAlign: 'right', fontSize: '1rem', color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{total.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

