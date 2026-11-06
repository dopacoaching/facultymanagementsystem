import { StatItem } from './types'
import s from './Dashboard.module.css'

interface StatsSectionProps {
  title: string
  stats: StatItem[]
}

export function StatsSection({ title, stats }: StatsSectionProps) {
  return (
    <section aria-label={title}>
      <div className={s.sectionHead}>
        <h2 className="section-label">{title}</h2>
      </div>
      <div className={s.statsGrid}>
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
