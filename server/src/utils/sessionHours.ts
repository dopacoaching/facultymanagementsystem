/**
 * Payable hours for a Studio Live entry, where every break is deducted in full.
 * The server recomputes this from start / end / breaks so a stale or foreign
 * client cannot store hours that follow the old 15-minute grace.
 * Mirrors client/src/lib/utils/sessionHours.ts — keep the two in sync.
 * Returns null when the times are unusable or less than 30 minutes remain.
 */
export function fullBreakHours(startTime: string, endTime: string, breakMinutes: number[]): number | null {
  const re = /^\d{2}:\d{2}$/
  if (!re.test(startTime) || !re.test(endTime)) return null
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const taken = breakMinutes.reduce((n, b) => n + (Number.isFinite(b) && b > 0 ? b : 0), 0)
  const payable = toMin(endTime) - toMin(startTime) - taken
  return payable >= 30 ? payable / 60 : null
}
