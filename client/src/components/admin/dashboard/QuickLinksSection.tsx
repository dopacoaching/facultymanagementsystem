import Link from 'next/link'

function QuickLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(79,70,229,.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      >
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>{desc}</div>
        </div>
      </div>
    </Link>
  )
}

export function QuickLinksSection() {
  return (
    <section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: '0.625rem' }}>
            HR &amp; Payroll
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            <QuickLink href="/hr/faculty"     icon="👥" label="Faculty"    desc="Manage faculty profiles" />
            <QuickLink href="/hr/salary"       icon="₹"  label="Salary"     desc="Calculate &amp; approve pay" />
            <QuickLink href="/hr/reports"      icon="📊" label="Reports"    desc="Salary history &amp; exports" />
            <QuickLink href="/admin/audit-log" icon="📋" label="Audit Log"  desc="View all system events" />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: '0.625rem' }}>
            Academics (Repeaters)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            <QuickLink href="/academics/sessions" icon="📅" label="Sessions"   desc="Log &amp; view class sessions" />
            <QuickLink href="/academics/schedule" icon="🗓" label="Schedule"   desc="Weekly class schedule" />
            <QuickLink href="/academics/exams"    icon="📝" label="Exam Topics" desc="Monday &amp; Friday exam topics" />
            <QuickLink href="/academics/syllabus" icon="📋" label="Syllabus"   desc="Annual syllabus plan" />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: '0.625rem' }}>
            Integrated School
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            <QuickLink href="/ig/sessions"  icon="🏫" label="IG Sessions"  desc="Log &amp; view IG sessions" />
            <QuickLink href="/ig/timetable" icon="⏱"  label="IG Timetable" desc="Daily class assignments" />
            <QuickLink href="/ig/chapters"  icon="📖" label="IG Chapters"  desc="Chapter scheduling progress" />
          </div>
        </div>
      </div>
    </section>
  )
}
