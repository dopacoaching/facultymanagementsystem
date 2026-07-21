interface ISChaptersStatsBarProps {
  total: number
  pending: number
  scheduled: number
  completed: number
  cancelled: number
}

export function ISChaptersStatsBar({ total, pending, scheduled, completed, cancelled }: ISChaptersStatsBarProps) {
  const stats = [
    { label: 'Total',        value: total,     color: 'var(--color-primary)' },
    { label: 'Not Scheduled', value: pending,  color: 'var(--color-muted)' },
    { label: 'Scheduled',    value: scheduled, color: 'var(--color-info, #3b82f6)' },
    { label: 'Completed',    value: completed, color: 'var(--color-success)' },
    { label: 'Cancelled',    value: cancelled, color: 'var(--color-danger)' },
  ]

  return (
    <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} className="stat-card" style={{ padding: '0.875rem 1rem' }}>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color, fontSize: '1.5rem' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}
