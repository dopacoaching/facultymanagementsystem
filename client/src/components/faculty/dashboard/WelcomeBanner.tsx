import type { Faculty } from '@/types'
import { MONTHS } from './types'

interface WelcomeBannerProps {
  faculty: Faculty | null
  month: number
  year: number
}

export function WelcomeBanner({ faculty, month, year }: WelcomeBannerProps) {
  return (
    <div style={{
      background: 'var(--color-brand-navy)',
      borderLeft: '4px solid var(--color-brand-sky)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.75rem 2rem',
      color: 'var(--color-on-navy)',
      marginBottom: '2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem',
    }}>
      <div>
        <div style={{ fontSize: '0.8125rem', opacity: 0.75, fontWeight: 500, marginBottom: '0.375rem' }}>
          Welcome back
        </div>
        <h1 style={{ color: 'var(--color-on-navy)', fontSize: '1.625rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
          {faculty?.name ?? '—'}
        </h1>
        <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>
          {faculty?.subject ?? ''}<span style={{ opacity: 0.65, marginLeft: '0.75rem', paddingLeft: '0.75rem', borderLeft: '1px solid var(--color-navy-rule)' }}>{faculty?.type ?? ''}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.65, marginBottom: '0.25rem' }}>This month</div>
        <div style={{ fontSize: '1.875rem', fontWeight: 600, lineHeight: 1 }}>{MONTHS[month - 1]} {year}</div>
      </div>
    </div>
  )
}
