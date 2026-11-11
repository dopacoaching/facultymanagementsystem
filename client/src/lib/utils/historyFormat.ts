import type { Session } from '@/types'

/** Total of the morning/lunch/afternoon break fields: '—' when none was recorded, 'Nil' for zero. */
export function breakLabel(x: Pick<Session, 'breakMinutes' | 'lunchBreakMinutes' | 'afternoonBreakMinutes'>): string {
  const parts = [x.breakMinutes, x.lunchBreakMinutes, x.afternoonBreakMinutes]
  if (parts.every((p) => p == null)) return '—'
  const total = parts.reduce<number>((t, p) => t + (p ?? 0), 0)
  return total === 0 ? 'Nil' : `${total}m`
}

/** When the entry was pushed, e.g. "12 Nov, 4:35 pm". */
export function enteredAtLabel(createdAt?: string): string {
  if (!createdAt) return '—'
  const d = new Date(createdAt)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

export const ENTRY_TYPE_SHORT: Record<string, string> = { LIVE: 'Live', SHOOT: 'Shoot' }
