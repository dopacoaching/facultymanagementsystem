import type { Faculty } from '@/types'
import { MONTHS } from './types'
import s from '../Portal.module.css'

interface WelcomeBannerProps {
  faculty: Faculty | null
  month: number
  year: number
}

function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0)
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
}

export function WelcomeBanner({ faculty, month, year }: WelcomeBannerProps) {
  return (
    <header className={s.welcome}>
      <div className={s.welcomeWho}>
        <span className={`avatar ${s.welcomeAvatar}`} aria-hidden="true">{initials(faculty?.name)}</span>
        <div style={{ minWidth: 0 }}>
          <div className={s.welcomeHello}>Welcome back</div>
          <h1 className={s.welcomeName}>{faculty?.name ?? '—'}</h1>
          <div className={s.welcomeMeta}>
            {faculty?.subject && <span>{faculty.subject}</span>}
            {faculty?.type && <span className="badge badge-gray badge-sentence">{faculty.type}</span>}
          </div>
        </div>
      </div>
      <div className={s.period}>
        <div className={s.periodLabel}>This month</div>
        <div className={s.periodValue}>{MONTHS[month - 1]} {year}</div>
      </div>
    </header>
  )
}
