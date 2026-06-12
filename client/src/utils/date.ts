/**
 * Local-date helpers.
 *
 * `new Date().toISOString().slice(0, 10)` returns the UTC calendar day, which
 * in IST (UTC+5:30) is *yesterday* between midnight and 05:30 local time —
 * wrong default session dates, wrong max-date pickers, and wrong "today"
 * dashboard windows. Always use these helpers for calendar-day strings.
 */

/** Format a Date as YYYY-MM-DD in the user's local timezone. */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayLocal(): string {
  return toLocalISO(new Date())
}

/** Add n days to a YYYY-MM-DD string (parsed at local noon to dodge DST/offset edges). */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toLocalISO(d)
}
