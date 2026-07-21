import Link from 'next/link'

const LINKS = [
  { href: '/hr/faculty', label: '👥 Manage Faculty' },
  { href: '/hr/salary',  label: '⚡ Salary Calculator' },
  { href: '/hr/reports', label: '📊 Reports & CSV' },
]

export function QuickLinks() {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-border)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
