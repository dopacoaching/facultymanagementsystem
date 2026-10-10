/**
 * Dated hourly-rate history. Faculty.hourlyRate always holds the rate in force
 * today (kept for existing readers); hourlyRateHistory is the full timeline.
 * Duplicated in server/src/utils/hourlyRate.ts — keep identical.
 */
export interface HourlyRateEntry {
  rate: number
  /** Day the rate takes effect (inclusive). The initial rate uses the epoch. */
  effectiveFrom: Date | string
  changedAt?: Date | string
  changedBy?: string
}

const EPOCH = new Date(0)

/** Parse 'YYYY-MM-DD' into a local-midnight Date; null if malformed/impossible. */
export function parseRateDate(iso: unknown): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === 'string' ? iso : '')
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

function sorted(history: HourlyRateEntry[] | undefined): { rate: number; at: number; src: HourlyRateEntry }[] {
  return (history ?? [])
    .map((h) => ({ rate: h.rate, at: new Date(h.effectiveFrom).getTime(), src: h }))
    .sort((a, b) => a.at - b.at)
}

/**
 * The rate in force on `on`. With no history, falls back to the flat
 * `fallback` (legacy faculty). A date before the first entry uses the
 * earliest rate so already-logged hours are never left unpriced.
 */
export function rateOn(history: HourlyRateEntry[] | undefined, fallback: number | undefined, on: Date): number | undefined {
  const list = sorted(history)
  if (list.length === 0) return fallback
  let found: number | undefined
  for (const e of list) if (e.at <= on.getTime()) found = e.rate
  return found ?? list[0].rate
}

/**
 * History + current rate after setting `newRate` from `effectiveFrom`. A second
 * change for the same day replaces that day's entry. Legacy faculty (flat rate,
 * no history) get their existing rate seeded as the initial entry first.
 */
export function planRateChange(
  current: { hourlyRate?: number; hourlyRateHistory?: HourlyRateEntry[] },
  newRate: number,
  effectiveFrom: Date,
  changedBy: string | undefined,
  now: Date = new Date(),
): { hourlyRate: number; hourlyRateHistory: HourlyRateEntry[] } {
  const history: HourlyRateEntry[] = (current.hourlyRateHistory ?? []).map((h) => ({
    rate: h.rate, effectiveFrom: h.effectiveFrom, changedAt: h.changedAt, changedBy: h.changedBy,
  }))
  if (history.length === 0 && current.hourlyRate != null) {
    history.push({ rate: current.hourlyRate, effectiveFrom: EPOCH })
  }
  const entry: HourlyRateEntry = { rate: newRate, effectiveFrom, changedAt: now, changedBy }
  const same = history.findIndex((h) => new Date(h.effectiveFrom).getTime() === effectiveFrom.getTime())
  if (same >= 0) history[same] = entry
  else history.push(entry)
  history.sort((a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime())
  return { hourlyRate: rateOn(history, undefined, now) as number, hourlyRateHistory: history }
}

/** Initial history for a newly created faculty member. */
export function initialRateHistory(rate: number, changedBy: string | undefined, now: Date = new Date()): HourlyRateEntry[] {
  return [{ rate, effectiveFrom: EPOCH, changedAt: now, changedBy }]
}

/** Shared validation for a rate value coming from a request body. */
export function validRate(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}
