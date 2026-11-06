import Link from 'next/link'
import { SALARY_ENABLED, SALARY_TEMPORARY_ENABLED, SALARY_LABELS } from '@/lib/constants/features'
import { Icon, type IconName } from '@/components/ui/Icon'
import s from './QuickLinks.module.css'

interface QuickLinkItem { href: string; label: string; desc: string; icon: IconName }

const LINKS: QuickLinkItem[] = [
  { href: '/hr/faculty', label: 'Manage Faculty', desc: 'Profiles, contracts and rates', icon: 'users' },
  ...(SALARY_ENABLED || SALARY_TEMPORARY_ENABLED
    ? [{ href: '/hr/salary', label: SALARY_LABELS.hrLink, desc: SALARY_LABELS.adminDesc, icon: 'wallet' } as QuickLinkItem]
    : []),
  { href: '/hr/reports', label: 'Entries Report', desc: 'Campus, subject and faculty-wise', icon: 'report' },
]

export function QuickLinks() {
  return (
    <section aria-labelledby="hr-quick-links">
      <h2 id="hr-quick-links" className={`section-label ${s.heading}`}>Quick Links</h2>
      <div className={s.grid}>
        {LINKS.map(({ href, label, desc, icon }) => (
          <Link key={href} href={href} className={`card ${s.tile}`}>
            <span className={s.icon}><Icon name={icon} size={20} /></span>
            <span className={s.text}>
              <span className={s.label}>{label}</span>
              <span className={s.desc}>{desc}</span>
            </span>
            <Icon name="chevronRight" size={16} className={s.arrow} />
          </Link>
        ))}
      </div>
    </section>
  )
}
