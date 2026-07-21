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
      background: 'linear-gradient(135deg, #3730a3, #4f46e5 60%, #6366f1)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.75rem 2rem',
      color: '#fff',
      marginBottom: '1.75rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem',
      boxShadow: '0 4px 20px rgba(79,70,229,.3)',
    }}>
      <div>
        <div style={{ fontSize: '0.8125rem', opacity: 0.7, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
          Welcome back
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.625rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>
          {faculty?.name ?? '—'}
        </h1>
        <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>
          {faculty?.subject ?? ''} · <span style={{ opacity: 0.65 }}>{faculty?.type ?? ''}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.65, marginBottom: '0.25rem' }}>This month</div>
        <div style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1 }}>{MONTHS[month - 1]} {year}</div>
      </div>
    </div>
  )
}
