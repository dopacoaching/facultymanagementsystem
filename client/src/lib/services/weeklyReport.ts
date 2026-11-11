import { Faculty } from '@/lib/models/Faculty'
import { Session } from '@/lib/models/Session'
import { dayRangeFilter, parseLocalDate, toLocalISODate } from '@/lib/utils/dateRange'
import { toWhatsAppNumber } from '@/lib/utils/phone'
import { defaultCountryCode } from '@/lib/services/whatsapp'

export interface TemporaryReport {
  facultyId: string
  name: string
  phone: string
  /** Digits-only international number, or null when there is no usable phone number. */
  whatsappNumber: string | null
  sessionCount: number
  totalHours: number
  /** Template variables {{1}}..{{3}}: name, period, summary. */
  params: [string, string, string]
}

const fmtHM = (hours: number) => {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60), m = total % 60
  return h > 0 ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}
const fmtDay = (iso: string) =>
  (parseLocalDate(iso) as Date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtShort = (iso: string) =>
  (parseLocalDate(iso) as Date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/** Active temporary faculty with their completed sessions in [from, to], ready to send. */
export async function buildTemporaryReports(from: string, to: string, onlyIds?: string[]): Promise<TemporaryReport[]> {
  const range = dayRangeFilter(from, to)
  if (!range) return []

  const filter: Record<string, unknown> = { type: 'TEMPORARY', isActive: true }
  if (onlyIds) filter._id = { $in: onlyIds }
  const faculty = await Faculty.find(filter).select('name phone').sort({ name: 1 }).lean()
  if (faculty.length === 0) return []

  const sessions = await Session.find({
    facultyId: { $in: faculty.map((f) => f._id) }, status: 'COMPLETED', sessionDate: range,
  }).select('facultyId subject sessionDate durationHours').sort({ sessionDate: 1 }).lean()

  const cc = defaultCountryCode()
  const period = from === to ? fmtShort(from) : `${fmtShort(from)} to ${fmtShort(to)}`

  return faculty.map((f) => {
    const mine = sessions.filter((s) => String(s.facultyId) === String(f._id))
    const totalHours = mine.reduce((t, s) => t + s.durationHours, 0)

    const days = new Map<string, { hours: number; subjects: Set<string> }>()
    for (const s of mine) {
      const day = toLocalISODate(new Date(s.sessionDate))
      const d = days.get(day) ?? { hours: 0, subjects: new Set<string>() }
      d.hours += s.durationHours
      if (s.subject) d.subjects.add(s.subject)
      days.set(day, d)
    }
    let summary = mine.length === 0
      ? 'No classes were recorded for this period.'
      : `${mine.length} ${mine.length === 1 ? 'class' : 'classes'}, ${fmtHM(totalHours)} in total. ` +
        Array.from(days, ([day, d]) => `${fmtDay(day)}: ${fmtHM(d.hours)}${d.subjects.size ? ` (${Array.from(d.subjects).join(', ')})` : ''}`).join('; ')
    if (summary.length > 900) summary = summary.slice(0, 896).replace(/[;,]?\s*\S*$/, '') + ' ...'

    return {
      facultyId: String(f._id),
      name: f.name,
      phone: f.phone ?? '',
      whatsappNumber: toWhatsAppNumber(f.phone, cc),
      sessionCount: mine.length,
      totalHours: Math.round(totalHours * 100) / 100,
      params: [f.name, period, summary],
    }
  })
}
