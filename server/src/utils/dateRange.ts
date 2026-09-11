const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Format a Date as YYYY-MM-DD in the server process's local timezone (NOT
 *  `d.toISOString().slice(0, 10)`, which is UTC and shifts the calendar day
 *  backward for any non-UTC host during the hours around its own midnight —
 *  e.g. IST, 00:00-05:29). Use this for "today"/"this month" API defaults. */
export function toLocalISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Parses a YYYY-MM-DD string as a local (not UTC) date. Rejects impossible
 *  calendar dates (e.g. 2026-02-30) that JS would otherwise silently roll
 *  into an adjacent month. */
export function parseLocalDate(iso: string): Date | null {
  const m = DATE_RE.exec(iso ?? '')
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (isNaN(dt.getTime())) return null
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

/** Inclusive whole-day range [from 00:00:00, to 23:59:59.999] for querying a
 *  single Date field (sessionDate, timestamp, date). Returns null if either
 *  bound fails to parse. */
export function dayRangeFilter(from: string, to: string): { $gte: Date; $lte: Date } | null {
  const fromDate = parseLocalDate(from)
  const toDate = parseLocalDate(to)
  if (!fromDate || !toDate) return null
  const end = new Date(toDate)
  end.setHours(23, 59, 59, 999)
  return { $gte: fromDate, $lte: end }
}

/** Enumerates the {month, year} pairs a date range touches, for querying
 *  models bucketed by calendar month rather than by a Date field
 *  (SalaryRecord, PayableDays, CarryForwardBalance). Capped at 36 months. */
export function monthYearPairsInRange(from: string, to: string): { month: number; year: number }[] {
  const fromDate = parseLocalDate(from)
  const toDate = parseLocalDate(to)
  if (!fromDate || !toDate) return []
  const pairs: { month: number; year: number }[] = []
  let y = fromDate.getFullYear()
  let m = fromDate.getMonth() + 1
  const endY = toDate.getFullYear()
  const endM = toDate.getMonth() + 1
  while ((y < endY || (y === endY && m <= endM)) && pairs.length < 36) {
    pairs.push({ month: m, year: y })
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return pairs
}

/** Overlap filter for SalaryRecord documents over a from/to range: matches by
 *  periodStart/periodEnd when present, falling back to month/year for
 *  records approved before the periodStart/periodEnd backfill migration
 *  (`migrate:salary-period-range`) has run against a given database. Merge
 *  the result into a `SalaryRecord.find()` filter (e.g. alongside `status`).
 *  Returns null if `from`/`to` don't parse. */
export function salaryPeriodOverlapFilter(from: string, to: string): Record<string, unknown> | null {
  const range = dayRangeFilter(from, to)
  if (!range) return null
  const monthYearOr = monthYearPairsInRange(from, to).map((p) => ({ month: p.month, year: p.year }))
  return {
    $or: [
      { periodStart: { $lte: range.$lte }, periodEnd: { $gte: range.$gte } },
      { periodStart: { $exists: false }, $or: monthYearOr },
    ],
  }
}
