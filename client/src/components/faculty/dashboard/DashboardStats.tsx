import type { SalaryResult } from '@/types'
import { SALARY_ENABLED } from '@/lib/constants/features'

interface DashboardStatsProps {
  completedCount: number
  totalHours: number
  allTimeHours: number | undefined
  /** ISO date of the most recent completed entry, if any. */
  lastEntry: string | undefined
  salary: SalaryResult | null
}

export function DashboardStats({ completedCount, totalHours, allTimeHours, lastEntry, salary }: DashboardStatsProps) {
  const stats = [
    { label: 'Sessions This Month',    value: completedCount,                                         color: 'var(--color-success)' },
    { label: 'Hours This Month',       value: `${totalHours.toFixed(1)} hrs`,                         color: 'var(--color-primary)' },
    { label: 'Total Hours (All Time)', value: allTimeHours != null ? `${allTimeHours.toFixed(1)} hrs` : '—', color: 'var(--color-primary)' },
    { label: 'Last Entry',
      value: lastEntry ? new Date(lastEntry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—',
      color: 'var(--color-text)' },
    ...(SALARY_ENABLED ? [{ label: 'Est. Salary',
      value: salary?.finalPayable != null
        ? `₹${salary.finalPayable.toLocaleString('en-IN')}`
        : salary?.status === 'PENDING_CONFIG' ? 'Pending' : '—',
      color: 'var(--color-success)',
    }] : []),
  ]

  return (
    <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} className="stat-card">
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color, fontSize: '1.5rem' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}
