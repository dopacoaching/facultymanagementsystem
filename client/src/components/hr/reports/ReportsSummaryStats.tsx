interface ReportsSummaryStatsProps {
  count: number
  total: number
  periodLabel: string
}

export function ReportsSummaryStats({ count, total, periodLabel }: ReportsSummaryStatsProps) {
  if (count === 0) return null

  return (
    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
      <div className="stat-card">
        <div className="stat-label">Approved Salaries</div>
        <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{count}</div>
        <div className="stat-sub">{periodLabel}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total Payable</div>
        <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.5rem' }}>
          ₹{total.toLocaleString('en-IN')}
        </div>
        <div className="stat-sub">{periodLabel}</div>
      </div>
    </div>
  )
}
