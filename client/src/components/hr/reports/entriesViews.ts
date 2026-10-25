import type { EntriesReport, EntryRow, NoClassRow } from '@/services/entries.service'
import { toLocalISO } from '@/utils/date'

/** Which slice of the entries report is on screen — and in the Copy / Excel sheet. */
export type ReportView = 'classes' | 'noclass' | 'whole'

export const VIEW_TABS: { key: ReportView; label: string }[] = [
  { key: 'classes', label: 'Class days report' },
  { key: 'noclass', label: 'No class report' },
  { key: 'whole',   label: 'Whole days report' },
]

export interface WholeDayRow {
  date: string
  campusName: string
  status: 'Classes' | 'No Class' | 'Not submitted' | 'Pending'
  entries: number
  hours: number
  /** Batch-level notes: partly No Class / partly not submitted. */
  detail: string
}

const dayKey = (campus: string, date: string) => `${campus}|${date}`

/** One row per campus per day (today and earlier) saying what happened: classes taken, a
 *  No Class marker, or nothing submitted. Newest day first. */
export function buildWholeDays(report: EntriesReport, campus: string, from: string, to: string): WholeDayRow[] {
  const today = toLocalISO(new Date())
  const campuses = report.campuses.filter((c) => !campus || c === campus)

  const classes = new Map<string, { n: number; h: number }>()
  for (const s of report.sessions) {
    const k = dayKey(s.campusName, s.date)
    const cur = classes.get(k) ?? { n: 0, h: 0 }
    cur.n += 1; cur.h += s.durationHours
    classes.set(k, cur)
  }
  const noClass = new Map<string, NoClassRow[]>()
  for (const n of report.noClass) {
    const k = dayKey(n.campusName, n.date)
    noClass.set(k, [...(noClass.get(k) ?? []), n])
  }
  const missing = new Map<string, string[]>()   // campus|date -> batch names ('' = whole campus)
  for (const m of report.missing) {
    for (const d of m.dates) missing.set(dayKey(m.campusName, d), [...(missing.get(dayKey(m.campusName, d)) ?? []), m.batchName ?? ''])
  }

  const rows: WholeDayRow[] = []
  const [fy, fm, fd] = from.split('-').map(Number)
  const end = to < today ? to : today
  for (let d = new Date(fy, fm - 1, fd); toLocalISO(d) <= end; d.setDate(d.getDate() + 1)) {
    const date = toLocalISO(d)
    for (const name of campuses) {
      const k = dayKey(name, date)
      const c = classes.get(k)
      const marks = noClass.get(k) ?? []
      const miss = missing.get(k) ?? []
      const markedBatches = marks.flatMap((m) => m.batchNames)
      const wholeMarked = marks.some((m) => m.batchIds.length === 0)
      const notes: string[] = []
      if (c && marks.length) notes.push(`No Class: ${wholeMarked ? 'whole campus' : markedBatches.join(', ')}`)
      if (c && miss.length) notes.push(`Not submitted: ${miss.map((b) => b || 'whole campus').join(', ')}`)
      let status: WholeDayRow['status']
      if (c) status = 'Classes'
      else if (marks.length && miss.length === 0) status = 'No Class'
      else if (miss.length) status = 'Not submitted'
      else if (marks.length) status = 'No Class'
      else status = date === today ? 'Pending' : 'Not submitted'
      if (!c && marks.length && miss.length) notes.push(`No Class: ${wholeMarked ? 'whole campus' : markedBatches.join(', ')}`, `Not submitted: ${miss.map((b) => b || 'whole campus').join(', ')}`)
      if (!c && status === 'No Class' && marks[0]?.reason) notes.push(marks[0].reason)
      rows.push({ date, campusName: name, status, entries: c?.n ?? 0, hours: c?.h ?? 0, detail: notes.join(' · ') })
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.campusName.localeCompare(b.campusName))
}

export const noClassRowsFor = (report: EntriesReport | null, campus: string) =>
  (report?.noClass ?? [])
    .filter((n) => !campus || n.campusName === campus)
    .sort((a, b) => b.date.localeCompare(a.date) || a.campusName.localeCompare(b.campusName))

/** Spreadsheet-safe text: tabs/newlines flattened, leading formula characters neutralised. */
export const cleanCell = (v: string) => v.replace(/[\t\r\n]+/g, ' ').replace(/^[=+\-@]/, "'$&")

export const hmText = (hours: number) => { const m = Math.round(hours * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }

/** A plain one-table sheet (used by the No class and Whole days views). */
export async function downloadSimpleSheet(head: string[], body: (string | number)[][], widths: number[], filename: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const header = head.map((h) => ({ value: h, type: String, fontWeight: 'bold' as const }))
  const rows = body.map((r) => r.map((v) => (typeof v === 'number'
    ? { value: v, type: Number }
    : { value: v ? cleanCell(v) : undefined, type: String })))
  await writeXlsxFile([header, ...rows] as never, { columns: widths.map((width) => ({ width })), stickyRowsCount: 1 }).toFile(filename)
}

export type { EntryRow }
