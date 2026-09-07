import Link from 'next/link'

const LINKS = [
  { href: '/hr/faculty',               label: 'Faculty',       desc: 'Manage faculty profiles' },
  { href: '/hr/salary',                label: 'Salary',        desc: 'Calculate & approve pay' },
  { href: '/hr/reports',               label: 'Reports',       desc: 'Salary history & exports' },
  { href: '/hr/reports/faculty-hours', label: 'Faculty Hours', desc: 'Hours taught, by subject' },
  { href: '/admin/audit-log',          label: 'Audit Log',     desc: 'All system events' },
  { href: '/academics/sessions',       label: 'Sessions',      desc: 'Hours logged by class teachers' },
]

function QuickLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.125rem 1.25rem',
          height: '100%',
          boxShadow: 'var(--shadow-sm)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-primary)'
          e.currentTarget.style.boxShadow = 'var(--shadow)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          e.currentTarget.style.transform = 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ fontWeight: 650, fontSize: '0.9375rem', color: 'var(--color-text)' }}>{label}</div>
          <span aria-hidden="true" style={{ color: 'var(--color-muted)', fontSize: '1rem' }}>&rarr;</span>
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{desc}</div>
      </div>
    </Link>
  )
}

export function QuickLinksSection() {
  return (
    <section>
      <h2 className="section-label">Quick Links</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {LINKS.map((l) => (
          <QuickLink key={l.href} {...l} />
        ))}
      </div>
    </section>
  )
}
