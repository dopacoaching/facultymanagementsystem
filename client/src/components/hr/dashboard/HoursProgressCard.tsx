import type { HoursProgressItem } from '@/services/salary.service'
import { progressColor, progressBg, contractShortName } from './types'

interface HoursProgressCardProps {
  hoursProgress: HoursProgressItem[]
}

export function HoursProgressCard({ hoursProgress }: HoursProgressCardProps) {
  if (hoursProgress.length === 0) return null

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h2>Hours vs Quota Progress</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Quota-based faculty only</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {hoursProgress.map((item) => (
          <div key={item.facultyId.toString()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
                  {contractShortName(item.contractType)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {item.logged.toFixed(1)} / {item.quota} hrs
                </span>
                <span
                  style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                    borderRadius: 999,
                    background: progressBg(item.status),
                    color: progressColor(item.status),
                  }}
                >
                  {item.status === 'MET' ? '✓ Met' : item.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div style={{
              height: 8, borderRadius: 4,
              background: 'var(--color-surface-2)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, item.pct)}%`,
                background: progressColor(item.status),
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
            {item.deficit > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-danger)', marginTop: '0.25rem' }}>
                ↓ {item.deficit.toFixed(1)} hrs short of quota
              </div>
            )}
            {item.surplus > 0 && item.contractType === 'BASE_OVERTIME' && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                ↑ {item.surplus.toFixed(1)} hrs overtime
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
