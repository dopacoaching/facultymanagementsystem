import { StatItem } from './types'

interface StatsSectionProps {
  title: string
  stats: StatItem[]
}

export function StatsSection({ title, stats }: StatsSectionProps) {
  return (
    <section>
      <h2 className="section-label" style={{ marginBottom: '0.75rem' }}>{title}</h2>
      <div className="stat-strip">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
