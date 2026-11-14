/** "14:05" -> "2:05 PM". Anything that is not HH:mm is returned unchanged. */
export function time12(t: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '')
  if (!m) return t ?? ''
  const h = Number(m[1])
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}
