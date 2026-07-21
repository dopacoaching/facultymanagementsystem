import type { SalaryResult } from '@/types'

interface DashboardStatsProps {
  completedCount: number
  totalHours: number
  allTimeHours: number | undefined
  upcomingCount: number
  salary: SalaryResult | null
}

export function DashboardStats({ completedCount, totalHours, allTimeHours, upcomingCount, salary }: DashboardStatsProps) {
  const stats = [
    { label: 'Sessions This Month', value: completedCount,       icon: '✅', color: 'var(--color-success)' },
    { label: 'Hours This Month',    value: `${totalHours.toFixed(1)} hrs`, icon: '⏱', color: 'var(--color-primary)' },
    { label: 'Total Hours (All Time)', value: allTimeHours != null ? `${allTimeHours.toFixed(1)} hrs` : '—', icon: '📊', color: 'var(--color-primary)' },
    { label: 'Upcoming',            value: upcomingCount,        icon: '⏳', color: 'var(--color-accent)' },
    { label: 'Est. Salary',
      value: salary?.finalPayable != null
        ? `₹${salary.finalPayable.toLocaleString('en-IN')}`
        : salary?.status === 'PENDING_CONFIG' ? 'Pending' : '—',
      icon: '₹',
      color: 'var(--color-success)',
    },
  ]

  return (
    <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
      {stats.map(({ label, value, icon, color }) => (
        <div key={label} className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color, fontSize: '1.5rem', marginTop: '0.25rem' }}>{value}</div>
            </div>
            <span style={{ fontSize: '1.4rem', opacity: 0.6 }}>{icon}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
