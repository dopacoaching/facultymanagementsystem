import { StatItem } from './types'

interface StatsSectionProps {
  title: string
  stats: StatItem[]
}

export function StatsSection({ title, stats }: StatsSectionProps) {
  return (
    <section>
      <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
        {title}
      </h2>
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
    </section>
  )
}
