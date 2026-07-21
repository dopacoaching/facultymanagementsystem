import { MONTHS } from './types'

interface ReportsSummaryStatsProps {
  count: number
  total: number
  month: number
  year: number
}

export function ReportsSummaryStats({ count, total, month, year }: ReportsSummaryStatsProps) {
  if (count === 0) return null

  return (
    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
      <div className="stat-card">
        <div className="stat-label">Approved Salaries</div>
        <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{count}</div>
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
  )
}
