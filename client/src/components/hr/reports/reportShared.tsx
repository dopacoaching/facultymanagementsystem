import { toLocalISO } from '@/utils/date'

/** Helpers shared by the Entries Report and Reports Not Submitted pages. */

export function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function isSunday(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 0
}

/** First day to last day of a "YYYY-MM" month, never past today. */
export function monthRange(ym: string, now: Date = new Date()): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0)
  return { from: toLocalISO(new Date(y, m - 1, 1)), to: toLocalISO(last > now ? now : last) }
}

export function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M5 3a1 1 0 0 1 1 1v1h12.5a.5.5 0 0 1 .4.8L16.5 9l2.4 3.2a.5.5 0 0 1-.4.8H6v8a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1z" />
    </svg>
  )
}
