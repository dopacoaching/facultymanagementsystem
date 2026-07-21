import type { DashboardData } from '@/services/salary.service'

interface TopStatsProps {
  totals: DashboardData['totals'] | undefined
}

export function TopStats({ totals: t }: TopStatsProps) {
  return (
    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
      {[
        { label: 'Total Faculty',   value: t?.totalFaculty ?? '—',  icon: '👥', color: 'var(--color-primary)' },
        { label: 'Approved',        value: t?.approved     ?? '—',  icon: '✅', color: 'var(--color-success)' },
        { label: 'Pending Approval',value: t?.pending      ?? '—',  icon: '⏳', color: 'var(--color-warning)' },
        { label: 'Blocked',         value: t?.blocked      ?? '—',  icon: '🚫', color: 'var(--color-danger)'  },
      ].map(({ label, value, icon, color }) => (
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
