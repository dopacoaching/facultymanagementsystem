interface ISStatsBarProps {
  totalSessions: number
  completed: number
  cancelled: number
  chaptersDone: number
  chaptersTotal: number
}

export function ISStatsBar({ totalSessions, completed, cancelled, chaptersDone, chaptersTotal }: ISStatsBarProps) {
  const stats = [
    { label: 'Total Sessions',    value: totalSessions,  icon: '📚', color: 'var(--color-primary)' },
    { label: 'Completed',         value: completed,        icon: '✅', color: 'var(--color-success)' },
    { label: 'Cancelled',         value: cancelled,        icon: '❌', color: 'var(--color-danger)' },
    { label: 'Chapters Done',     value: `${chaptersDone}/${chaptersTotal}`, icon: '📖', color: 'var(--color-accent)' },
  ]

  return (
    <div className="stats-grid">
      {stats.map(({ label, value, icon, color }) => (
        <div key={label} className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
            </div>
            <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>{icon}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
