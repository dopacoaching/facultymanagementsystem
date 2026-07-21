import type { FacultyHoursItem } from '@/services/session.service'

interface QuotaWarningsProps {
  quotaWarnings: FacultyHoursItem[]
}

export function QuotaWarnings({ quotaWarnings }: QuotaWarningsProps) {
  if (quotaWarnings.length === 0) return null

  return (
    <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {quotaWarnings.map((f) => {
        const isMissed = f.status === 'MISSED'
        return (
          <div
            key={String(f.facultyId)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap',
              padding: '0.875rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: isMissed ? 'rgba(239,68,68,.08)' : 'rgba(245,158,11,.08)',
              border: `1px solid ${isMissed ? 'rgba(239,68,68,.25)' : 'rgba(245,158,11,.25)'}`,
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{isMissed ? '🚨' : '⚠️'}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, color: isMissed ? 'var(--color-danger)' : '#92400e' }}>
                {f.name}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginLeft: '0.375rem' }}>
                ({f.subject})
              </span>
              <span style={{ color: isMissed ? 'var(--color-danger)' : '#b45309', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                — {f.logged.toFixed(1)}h logged of {f.quota}h required
                {f.deficit != null && f.deficit > 0 && ` · ${f.deficit.toFixed(1)}h short`}
              </span>
            </div>
            <span className={`badge ${isMissed ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
              {isMissed ? 'Quota Missed' : 'At Risk'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
