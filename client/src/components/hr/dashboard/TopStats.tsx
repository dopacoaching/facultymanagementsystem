import { Icon, type IconName } from '@/components/ui/Icon'
import type { DashboardData } from '@/services/salary.service'

interface TopStatsProps {
  totals: DashboardData['totals'] | undefined
}

export function TopStats({ totals: t }: TopStatsProps) {
  const items: { label: string; value: string | number; icon: IconName; color: string }[] = [
    { label: 'Total Faculty',    value: t?.totalFaculty ?? '—', icon: 'users', color: 'var(--color-primary)' },
    { label: 'Approved',         value: t?.approved     ?? '—', icon: 'check', color: 'var(--color-success)' },
    { label: 'Pending Approval', value: t?.pending      ?? '—', icon: 'clock', color: 'var(--color-warning)' },
    { label: 'Blocked',          value: t?.blocked      ?? '—', icon: 'ban',   color: 'var(--color-danger)'  },
  ]
  return (
    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
      {items.map(({ label, value, icon, color }) => (
        <div key={label} className="stat-card">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
            </div>
            <span style={{ opacity: 0.6, color }}><Icon name={icon} size={22} /></span>
          </div>
        </div>
      ))}
    </div>
  )
}
