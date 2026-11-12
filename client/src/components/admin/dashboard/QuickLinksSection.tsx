import Link from 'next/link'
import { SALARY_ENABLED, SALARY_TEMPORARY_ENABLED, SALARY_LABELS } from '@/lib/constants/features'
import { Icon, type IconName } from '@/components/ui/Icon'
import s from './Dashboard.module.css'

interface QuickLinkItem { href: string; label: string; desc: string; icon: IconName }

const LINKS: QuickLinkItem[] = [
  { href: '/hr/faculty',               label: 'Faculty',       desc: 'Manage faculty profiles', icon: 'users' },
  ...(SALARY_ENABLED || SALARY_TEMPORARY_ENABLED ? [{ href: '/hr/salary', label: SALARY_LABELS.adminLink, desc: SALARY_LABELS.adminDesc, icon: 'wallet' } as QuickLinkItem] : []),
  { href: '/hr/reports',               label: 'Entries Report', desc: 'Campus, subject & faculty-wise', icon: 'report' },
  { href: '/hr/reports?joint=last-month', label: 'Joint Entries', desc: 'IG and repeaters joint classes, last month', icon: 'layers' },
  { href: '/hr/reports/faculty-hours', label: 'Faculty Hours', desc: 'Hours taught, by subject', icon: 'clock' },
  { href: '/admin/audit-log',          label: 'Audit Log',     desc: 'All system events', icon: 'shield' },
  { href: '/academics/sessions',       label: 'Sessions',      desc: 'Hours logged by class teachers', icon: 'book' },
]

function QuickLink({ href, label, desc, icon }: QuickLinkItem) {
  return (
    <Link href={href} className={`card ${s.link}`}>
      <span className={s.linkIcon}><Icon name={icon} size={20} /></span>
      <span className={s.linkText}>
        <span className={s.linkLabel}>{label}</span>
        <span className={s.linkDesc}>{desc}</span>
      </span>
      <Icon name="chevronRight" size={16} className={s.linkArrow} />
    </Link>
  )
}

export function QuickLinksSection() {
  return (
    <section aria-labelledby="admin-quick-links">
      <div className={s.sectionHead}>
        <h2 className="section-label" id="admin-quick-links">Quick Links</h2>
      </div>
      <div className={s.links}>
        {LINKS.map((l) => (
          <QuickLink key={l.href} {...l} />
        ))}
      </div>
    </section>
  )
}
