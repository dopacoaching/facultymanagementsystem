import type { EntriesReport, NoClassRow } from '@/services/entries.service'
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
  status: 'Classes' | 'No Class' | 'Not submitted' | 'Pending' | 'Unknown'
  entries: number
  hours: number
  /** Batch-level notes: partly No Class / partly not submitted. */
  detail: string
}

const dayKey = (campus: string, date: string) => `${campus}|${date}`

/** Last day the Whole days view covers: the range end, capped at today. */
export const wholeDaysEnd = (to: string) => { const today = toLocalISO(new Date()); return to < today ? to : today }

/** One row per campus per day (today and earlier) saying what happened: classes taken, a
 *  No Class marker, or nothing submitted. Newest day first. The server's `missing` list is the
 *  source of truth for "Not submitted"; a day it says nothing about is never shown as missing. */
export function buildWholeDays(report: EntriesReport, campus: string, from: string, to: string): WholeDayRow[] {
  const today = toLocalISO(new Date())
  const campuses = report.campuses.filter((c) => !campus || c === campus)

  const classes = new Map<string, { n: number; h: number }>()
  for (const s of report.sessions) {
    // A joint IG class counts under every school it covered.
    for (const name of s.campusNames) {
      if (campus && name !== campus) continue
      const k = dayKey(name, s.date)
      const cur = classes.get(k) ?? { n: 0, h: 0 }
      cur.n += 1; cur.h += s.durationHours
      classes.set(k, cur)
    }
  }
  const noClass = new Map<string, NoClassRow[]>()
  for (const n of report.noClass) {
    const k = dayKey(n.campusName, n.date)
    noClass.set(k, [...(noClass.get(k) ?? []), n])
  }
  const missing = new Map<string, string[]>()   // campus|date -> batch names ('' = whole campus)
  for (const m of report.missing) {
    for (const d of m.dates) {
      const k = dayKey(m.campusName, d)
      missing.set(k, [...(missing.get(k) ?? []), m.batchName ?? ''])
    }
  }

  const rows: WholeDayRow[] = []
  const [fy, fm, fd] = from.split('-').map(Number)
  const end = wholeDaysEnd(to)
  for (let d = new Date(fy, fm - 1, fd); toLocalISO(d) <= end; d.setDate(d.getDate() + 1)) {
    const date = toLocalISO(d)
    for (const name of campuses) {
      const k = dayKey(name, date)
      const c = classes.get(k)
      const marks = noClass.get(k) ?? []
      const miss = missing.get(k) ?? []
      const wholeMarked = marks.some((m) => m.batchIds.length === 0)
      const noClassNote = marks.length ? `No Class: ${wholeMarked ? 'whole campus' : marks.flatMap((m) => m.batchNames).join(', ')}` : ''
      const missNote = miss.length ? `Not submitted: ${miss.map((b) => b || 'whole campus').join(', ')}` : ''
      const notes: string[] = []
      let status: WholeDayRow['status']
      if (c) {
        status = 'Classes'
        notes.push(noClassNote, missNote)
      } else if (miss.length) {
        status = 'Not submitted'
        notes.push(noClassNote, missNote)
      } else if (marks.length) {
        status = 'No Class'
        if (marks[0].reason) notes.push(marks[0].reason)
      } else if (date === today) {
        status = 'Pending'
      } else {
        // The server found this day covered but sent no visible entry (list capped) — or didn't check it.
        status = 'Unknown'
        notes.push(report.truncated ? 'Too many entries to show — narrow the dates' : 'No data for this day')
      }
      rows.push({ date, campusName: name, status, entries: c?.n ?? 0, hours: c?.h ?? 0, detail: notes.filter(Boolean).join(' · ') })
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
