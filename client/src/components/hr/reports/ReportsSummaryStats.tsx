interface ReportsSummaryStatsProps {
  count: number
  total: number
  periodLabel: string
}

export function ReportsSummaryStats({ count, total, periodLabel }: ReportsSummaryStatsProps) {
  if (count === 0) return null

  return (
    <div className="stats-grid" style={{ marginBottom: 'var(--space-5)' }}>
      <div className="stat-card">
        <div className="stat-label">Approved Salaries</div>
        <div className="stat-value">{count}</div>
        <div className="stat-sub">{periodLabel}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total Payable</div>
        <div className="stat-value">₹{total.toLocaleString('en-IN')}</div>
        <div className="stat-sub">{periodLabel}</div>
      </div>
    </div>
  )
}
