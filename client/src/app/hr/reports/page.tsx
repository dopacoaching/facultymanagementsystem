'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAppSelector } from '@/store/hooks'
import { remove as removeSession } from '@/services/session.service'
import { EditEntryDialog } from '@/components/hr/reports/EditEntryDialog'
import { getEntriesReport, type EntriesReport, type EntryRow } from '@/services/entries.service'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { useToast } from '@/components/ui/Toast'
import { toLocalISO } from '@/utils/date'
import { fmtDay, monthRange } from '@/components/hr/reports/reportShared'
import { useActiveFaculty } from '@/hooks/useActiveFaculty'
import {
  VIEW_TABS, buildWholeDays, wholeDaysEnd, noClassRowsFor, cleanCell, hmText, downloadSimpleSheet,
  type ReportView, type WholeDayRow,
} from '@/components/hr/reports/entriesViews'

type FacultyKind = 'PERMANENT' | 'TEMPORARY' | 'ALL'
type GroupBy = 'campus' | 'subject' | 'faculty'

const KIND_TABS: { key: FacultyKind; label: string }[] = [
  { key: 'PERMANENT', label: 'Permanent faculty' },
  { key: 'TEMPORARY', label: 'Temporary faculty' },
  { key: 'ALL',       label: 'All faculty' },
]
const GROUP_TABS: { key: GroupBy; label: string }[] = [
  { key: 'campus',  label: 'Campus-wise' },
  { key: 'subject', label: 'Subject-wise' },
  { key: 'faculty', label: 'Faculty-wise' },
]

function formatHM(hours: number): string {
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Sessions → { key → rows } keeping insertion order of the sorted input. */
function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    const list = map.get(k)
    if (list) list.push(r); else map.set(k, [r])
  }
  return map
}

const MODE_LABELS: Record<string, string> = {
  ONLINE: 'Online', OFFLINE: 'Offline',
  ONLINE_DOUBT_CLEARANCE: 'Online Doubt Clearance', OFFLINE_DOUBT_CLEARANCE: 'Offline Doubt Clearance',
}

/** Total break minutes across the morning/lunch/afternoon fields, or null if none was recorded. */
function breakTotal(r: EntryRow): number | null {
  const parts = [r.breakMinutes, r.lunchBreakMinutes, r.afternoonBreakMinutes]
  return parts.every((p) => p == null) ? null : parts.reduce<number>((t, p) => t + (p ?? 0), 0)
}
const breakLabel = (r: EntryRow) => { const t = breakTotal(r); return t == null ? '—' : t === 0 ? 'Nil' : `${t}m` }

/** 'PERMANENT' → 'Permanent'; tolerates a missing type on legacy faculty. */
const typeLabel = (t?: string) => (t ? t.charAt(0) + t.slice(1).toLowerCase() : 'Unknown type')

const sumHours = (rows: EntryRow[]) => rows.reduce((t, r) => t + r.durationHours, 0)

/** Running total of hours per faculty, in date order. Keyed by entry id. */
const byEntryOrder = (a: EntryRow, b: EntryRow) =>
  a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime) || a._id.localeCompare(b._id)

function cumulativeHours(rows: EntryRow[]): Map<string, number> {
  const ordered = [...rows].sort(byEntryOrder)
  const sums = new Map<string, number>()
  const out = new Map<string, number>()
  for (const r of ordered) {
    const next = (sums.get(r.facultyId) ?? 0) + r.durationHours
    sums.set(r.facultyId, next)
    out.set(r._id, next)
  }
  return out
}

function EntryTable({ rows, hideCols, showBatch, onDelete, onEdit, totals }: { rows: EntryRow[]; hideCols?: ('campus' | 'faculty' | 'subject')[]; showBatch: boolean; onDelete?: (r: EntryRow) => void; onEdit?: (r: EntryRow) => void; totals: Map<string, number> }) {
  const showCampus = !hideCols?.includes('campus')
  const showFaculty = !hideCols?.includes('faculty')
  const showSubject = !hideCols?.includes('subject')
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            {showCampus && <th>Campus</th>}
            {showBatch && <th>Batch</th>}
            {showFaculty && <th>Faculty</th>}
            {showSubject && <th>Subject</th>}
            <th>Chapter</th>
            <th>Class mode</th>
            <th>Start–End</th>
            <th style={{ textAlign: 'right' }} title="Total break minutes as entered on the form — not the amount deducted from the time taken.">Break</th>
            <th>Entered by</th>
            <th>Comment</th>
            <th style={{ textAlign: 'right' }}>Time</th>
            <th style={{ textAlign: 'right' }} title="This faculty's hours added up in date order, counting only the dates and filters selected above, not their full-period total.">Total so far*</th>
            {(onDelete || onEdit) && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{fmtDay(r.date)}</td>
              {showCampus && <td style={{ color: 'var(--color-text-secondary)' }}>{r.campusName}</td>}
              {showBatch && <td style={{ color: 'var(--color-text-secondary)' }}>{r.batchName || '—'}</td>}
              {showFaculty && <td style={{ fontWeight: 600 }}>{r.facultyName}</td>}
              {showSubject && <td style={{ color: 'var(--color-text-secondary)' }}>{r.subject}</td>}
              <td style={{ color: 'var(--color-text-secondary)' }}>{r.chapter || '—'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{r.classMode ? MODE_LABELS[r.classMode] ?? r.classMode : '—'}</td>
              <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.startTime ? `${r.startTime}–${r.endTime || '—'}` : '—'}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{breakLabel(r)}</td>
              <td style={{ color: 'var(--color-text-secondary)' }}>{r.updatedByName || '—'}</td>
              <td style={{ color: 'var(--color-text-secondary)', minWidth: 160, whiteSpace: 'pre-wrap' }}>{r.comment || '—'}</td>
              <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.entryType && <span className={`badge ${r.entryType === 'SHOOT' ? 'badge-blue' : 'badge-gray'}`} style={{ marginLeft: '0.5rem' }}>{r.entryType === 'SHOOT' ? 'Shoot' : 'Live'}</span>}{formatHM(r.durationHours)}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{formatHM(totals.get(r._id) ?? r.durationHours)}</td>
              {(onDelete || onEdit) && (
                <td style={{ whiteSpace: 'nowrap' }}>
                  {onEdit && (
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginRight: '0.375rem' }} onClick={() => onEdit(r)}>Edit</button>
                  )}
                  {onDelete && <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(r)}>Delete</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupHeader({ title, count, hours, level = 1 }: { title: string; count: number; hours: number; level?: 1 | 2 }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem',
      padding: level === 1 ? '0 0 0.5rem' : '0.75rem 0 0.375rem',
    }}>
      {level === 1 ? <h3 style={{ margin: 0 }}>{title}</h3> : <h4 style={{ margin: 0 }}>{title}</h4>}
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
        {count} {count === 1 ? 'entry' : 'entries'} ·{' '}
        <strong style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{formatHM(hours)}</strong>
      </span>
    </div>
  )
}

/** Tab-separated text for the current view, ready to paste into a sheet. */
function toTSV(rows: EntryRow[], totals: Map<string, number>): string {
  const hmOf = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }
  const head = ['Date', 'Campus', 'Batch', 'Faculty', 'Faculty type', 'Subject', 'Chapter', 'Class mode', 'Start', 'End', 'Break entered (min)', 'Entered by', 'Entry type', 'Time (h:mm)', 'Hours', 'Comment', 'Total so far (h:mm)']
  // Neutralise spreadsheet formulas (=, +, -, @) in coordinator-typed text.
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, ' ').replace(/^[=+\-@]/, "'$&")
  const lines = rows.map((r) => {
    const mins = Math.round(r.durationHours * 60)
    return [
      r.date, r.campusName, r.batchName, r.facultyName, r.facultyType, r.subject, r.chapter,
      r.classMode ? MODE_LABELS[r.classMode] ?? r.classMode : '', r.startTime, r.endTime, breakTotal(r) ?? '', r.updatedByName, r.entryType ? (r.entryType === 'SHOOT' ? 'Shoot' : 'Live') : '',
      `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`, r.durationHours.toFixed(2), r.comment, hmOf(totals.get(r._id) ?? r.durationHours),
    ].map((v) => clean(String(v))).join('\t')
  })
  return [head.join('\t'), ...lines].join('\n')
}

/** One sheet laid out like the screen: a bold header row per group (with its entry
 *  count and total hours), that group's entries in date order, then a blank row.
 *  Loaded on demand so the xlsx writer stays out of the page's initial bundle. */
async function downloadExcel(rows: EntryRow[], group: GroupBy, from: string, to: string, totals: Map<string, number>) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const head = ['Date', 'Campus', 'Batch', 'Faculty', 'Faculty type', 'Subject', 'Chapter', 'Class mode', 'Entry type',
    'Start', 'End', 'Break entered (min)', 'Entered by', 'Time (h:mm)', 'Hours', 'Comment', 'Total so far (h:mm)']
  const hm = (hours: number) => { const m = Math.round(hours * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }
  const text = (value: string | undefined) => ({ value: value || undefined, type: String })
  const blank = () => head.map(() => null)

  const header = head.map((h) => ({ value: h, type: String, fontWeight: 'bold' as const }))
  const entryRow = (r: EntryRow) => {
    const brk = breakTotal(r)
    return [
      text(r.date), text(r.campusName), text(r.batchName), text(r.facultyName), text(r.facultyType),
      text(r.subject), text(r.chapter), text(r.classMode ? MODE_LABELS[r.classMode] ?? r.classMode : ''),
      text(r.entryType ? (r.entryType === 'SHOOT' ? 'Shoot' : 'Live') : ''),
      text(r.startTime), text(r.endTime),
      { value: brk ?? undefined, type: Number },
      text(r.updatedByName),
      text(hm(r.durationHours)),
      { value: Math.round(r.durationHours * 100) / 100, type: Number, format: '0.00' },
      text(r.comment ? r.comment.replace(/^[=+\-@]/, "'$&") : ''),
      text(hm(totals.get(r._id) ?? r.durationHours)),
    ]
  }
  /** Bold shaded row: title on the left, "N entries" under Entered by, totals under Time / Hours. */
  const groupRow = (title: string, list: EntryRow[], indent = false) => {
    const total = sumHours(list)
    const cell = (value: string | number | undefined, extra: object = {}) =>
      ({ value, type: typeof value === 'number' ? Number : String, fontWeight: 'bold' as const, backgroundColor: indent ? '#f1f5f9' : '#dbe4f5', ...extra })
    const r: unknown[] = head.map(() => cell(undefined))
    r[0] = cell(indent ? `    ${title}` : title)
    r[12] = cell(`${list.length} ${list.length === 1 ? 'entry' : 'entries'}`)
    r[13] = cell(hm(total))
    r[14] = cell(Math.round(total * 100) / 100, { format: '0.00' })
    return r
  }

  const body: unknown[][] = []
  const addGroup = (title: string, list: EntryRow[], indent = false) => {
    body.push(groupRow(title, list, indent), ...list.map(entryRow))
  }
  const byName = ([a]: [string, unknown], [b]: [string, unknown]) => a.localeCompare(b)

  if (group === 'faculty') {
    const groups = Array.from(groupBy(rows, (r) => r.facultyId).entries())
      .sort(([, a], [, b]) => a[0].facultyName.localeCompare(b[0].facultyName))
    for (const [, list] of groups) {
      addGroup(`${list[0].facultyName} · ${typeLabel(list[0].facultyType)} · ${list[0].subject}`, list)
      body.push(blank())
    }
  } else {
    for (const [campusName, campusRows] of Array.from(groupBy(rows, (r) => r.campusName).entries()).sort(byName)) {
      if (group === 'campus') {
        addGroup(campusName, campusRows)
      } else {
        body.push(groupRow(campusName, campusRows))
        for (const [subject, list] of Array.from(groupBy(campusRows, (r) => r.subject).entries()).sort(byName)) {
          addGroup(subject, list, true)
        }
      }
      body.push(blank())
    }
  }
  body.push(groupRow('Total', rows))

  const columns = [12, 22, 18, 24, 14, 14, 30, 16, 11, 8, 8, 12, 18, 11, 9, 40, 14].map((width) => ({ width }))
  await writeXlsxFile([header, ...body] as never, { columns, stickyRowsCount: 1 }).toFile(`entries-report_${from}_to_${to}.xlsx`)
}

export default function EntriesReportPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo]     = useState(toLocalISO(now))
  const [report, setReport]   = useState<EntriesReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [kind, setKind]       = useState<FacultyKind>('PERMANENT')
  const [group, setGroup]     = useState<GroupBy>('campus')
  /** Excel layout chosen for the download; null follows the on-screen view. */
  const [exportChoice, setExportChoice] = useState<GroupBy | null>(null)
  const exportBy = exportChoice ?? group
  const [campus, setCampus]   = useState('')
  /** Class days (entries) / No class markers / Whole days (every campus-day's status). */
  const [view, setView]       = useState<ReportView>('classes')
  /** One faculty of the chosen type; '' = all of that type. */
  const [facultyId, setFacultyId] = useState('')
  const allFaculty = useActiveFaculty(accessToken)

  const canCopy = role === 'ADMIN'
  const canDelete = role === 'ADMIN' || role === 'HR_MANAGER'

  const [editing, setEditing] = useState<EntryRow | null>(null)

  async function deleteEntry(r: EntryRow) {
    if (!accessToken || !window.confirm(`Delete ${r.facultyName}'s entry on ${fmtDay(r.date)} permanently? This cannot be undone.`)) return
    try {
      await removeSession(r._id, accessToken)
      toast.success('Entry deleted', 'The entry has been removed.')
      await load()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Could not delete the entry')
    }
  }

  /** Latest request wins — a slow earlier response must not overwrite newer data. */
  const requestId = useRef(0)

  async function load() {
    if (!accessToken || !from || !to) return
    if (from > to) { setError('The start date must not be after the end date.'); return }
    const id = ++requestId.current
    setLoading(true); setError('')
    try {
      const data = await getEntriesReport(from, to, accessToken)
      if (id !== requestId.current) return
      setReport(data)
      // A campus picked earlier may not exist in this report — fall back to all campuses.
      setCampus((c) => (c && !data.campuses.includes(c) ? '' : c))
    } catch (e: unknown) {
      if (id !== requestId.current) return
      setError(e instanceof Error ? e.message : 'Failed to load the report')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }
  useEffect(() => { load() }, [accessToken, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Month picker drives the same from/to range as the date pickers. */
  function pickMonth(ym: string) {
    if (!ym) return
    const r = monthRange(ym, now)
    setFrom(r.from); setTo(r.to)
  }

  const rows = useMemo(() => {
    const all = report?.sessions ?? []
    return all
      .filter((r) => kind === 'ALL' || (kind === 'PERMANENT') === (r.facultyType === 'PERMANENT'))
      .filter((r) => !campus || r.campusName === campus)
      .filter((r) => !facultyId || r.facultyId === facultyId)
      .sort(byEntryOrder)
  }, [report, kind, campus, facultyId])

  const noClassRows = useMemo(() => noClassRowsFor(report, campus), [report, campus])
  const wholeRows = useMemo(() => (report ? buildWholeDays(report, campus, from, to) : []), [report, campus, from, to])

  /** Faculty for the dropdown: only the type picked in the tabs (Permanent / Temporary). */
  const facultyChoices = useMemo(
    () => [
      ...allFaculty,
      // Former faculty who still have entries in this range stay selectable.
      ...Array.from(new Map((report?.sessions ?? []).map((r) => [r.facultyId, { _id: r.facultyId, name: r.facultyName, subject: '', type: r.facultyType }])).values())
        .filter((f) => !allFaculty.some((a) => a._id === f._id)),
    ]
      .filter((f) => kind === 'ALL' || (kind === 'PERMANENT') === (f.type === 'PERMANENT'))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allFaculty, report, kind],
  )

  /** Each faculty's hours added up in date order across the filtered rows (6h, then 12h, then 17h...). */
  const totals = useMemo(() => cumulativeHours(rows), [rows])

  const byCampus = useMemo(() => {
    if (group === 'faculty') return []
    const map = groupBy(rows, (r) => r.campusName)
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [rows, group])

  // Decided once from the whole filtered set so every table shares the same columns.
  const showBatch = useMemo(() => rows.some((r) => r.batchName), [rows])

  const byFaculty = useMemo(() => {
    if (group !== 'faculty') return []
    const map = groupBy(rows, (r) => r.facultyId)
    return Array.from(map.entries()).sort(([, a], [, b]) => a[0].facultyName.localeCompare(b[0].facultyName))
  }, [rows, group])

  /** Header + body of the No class / Whole days sheets (the Class days sheet has its own layout). */
  const noClassSheet = useMemo(() => ({
    head: ['Date', 'Campus', 'Batches', 'Reason'],
    body: noClassRows.map((n) => [n.date, n.campusName, n.batchNames.length ? n.batchNames.join(', ') : 'Whole campus', n.reason] as (string | number)[]),
  }), [noClassRows])
  const wholeSheet = useMemo(() => ({
    head: ['Date', 'Campus', 'Status', 'Entries', 'Time (h:mm)', 'Hours', 'Details'],
    body: wholeRows.map((w: WholeDayRow) => [w.date, w.campusName, w.status, w.entries, w.entries ? hmText(w.hours) : '', Math.round(w.hours * 100) / 100, w.detail] as (string | number)[]),
  }), [wholeRows])
  const sheetCount = view === 'classes' ? rows.length : view === 'noclass' ? noClassRows.length : wholeRows.length

  async function copyData() {
    try {
      const sheet = view === 'noclass' ? noClassSheet : wholeSheet
      const text = view === 'classes'
        ? toTSV(rows, totals)
        : [sheet.head.join('\t'), ...sheet.body.map((r) => r.map((v) => (typeof v === 'string' ? cleanCell(v) : String(v))).join('\t'))].join('\n')
      await navigator.clipboard.writeText(text)
      toast.success('Copied', `${sheetCount} ${sheetCount === 1 ? 'row' : 'rows'} copied — paste into a sheet.`)
    } catch {
      toast.error('Copy failed', 'Your browser blocked clipboard access.')
    }
  }

  async function exportExcel() {
    try {
      if (view === 'noclass') {
        await downloadSimpleSheet(noClassSheet.head, noClassSheet.body, [12, 24, 30, 40], `no-class-report_${from}_to_${to}.xlsx`)
      } else if (view === 'whole') {
        await downloadSimpleSheet(wholeSheet.head, wholeSheet.body, [12, 24, 14, 9, 12, 9, 50], `whole-days-report_${from}_to_${to}.xlsx`)
      } else {
        await downloadExcel(rows, exportBy, from, to, totals)
      }
    } catch {
      toast.error('Download failed', 'The Excel file could not be created.')
    }
  }

  /** One place decides the table's shared props, so the faculty and campus layouts can't drift apart. */
  const table = (list: EntryRow[], hideCols: ('campus' | 'faculty' | 'subject')[]) => (
    <EntryTable rows={list} hideCols={hideCols} showBatch={showBatch} onDelete={canDelete ? deleteEntry : undefined} onEdit={canDelete ? setEditing : undefined} totals={totals} />
  )

  const kindLabel = KIND_TABS.find((t) => t.key === kind)!.label.toLowerCase()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Entries Report</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Sessions pushed by each campus — {fmtDay(from)} to {fmtDay(to)}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/hr/reports/not-submitted" className="btn btn-outline">Reports not submitted</Link>
          {sheetCount > 0 && (
            <>
              {canCopy && (
                <button type="button" className="btn btn-outline" onClick={copyData} title="Copy the entries below as tab-separated text">
                  Copy data
                </button>
              )}
              {view === 'classes' && <select className="input" aria-label="Excel layout" value={exportBy} onChange={(e) => setExportChoice(e.target.value as GroupBy)} style={{ width: 'auto' }}>
                {GROUP_TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>}
              <button type="button" className="btn btn-primary" onClick={exportExcel} title="Download the entries below as an Excel file, laid out as chosen">
                Download Excel
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div style={{ marginBottom: '1rem' }}><ErrorAlert message={error} onRetry={load} /></div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="er-month">Month</label>
            <input id="er-month" type="month" className="input" max={toLocalISO(now).slice(0, 7)}
              value={from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : ''}
              onChange={(e) => pickMonth(e.target.value)} style={{ minWidth: 150 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="er-view">Report</label>
            <select id="er-view" className="input" value={view} onChange={(e) => setView(e.target.value as ReportView)} style={{ minWidth: 190 }}>
              {VIEW_TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" htmlFor="er-campus">Campus</label>
            <select id="er-campus" className="input" value={campus} onChange={(e) => setCampus(e.target.value)} style={{ minWidth: 190 }}>
              <option value="">All campuses</option>
              {(report?.campuses ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" />
      </div>

      {/* ── View switches ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {view === 'classes' && KIND_TABS.map((t) => (
            <button key={t.key} type="button" className={`btn btn-sm ${kind === t.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setKind(t.key); setFacultyId('') }}>
              {t.label}
            </button>
          ))}
          {view === 'classes' && (
            <select className="input" aria-label="Faculty" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} style={{ width: 'auto', minWidth: 200 }}>
              <option value="">{kind === 'PERMANENT' ? 'All permanent faculty' : kind === 'TEMPORARY' ? 'All temporary faculty' : 'All faculty'}</option>
              {facultyChoices.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {view === 'classes' && GROUP_TABS.map((t) => (
            <button key={t.key} type="button" className={`btn btn-sm ${group === t.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setGroup(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {report?.truncated && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          This range has more entries than can be shown. Narrow the dates to see everything.
        </div>
      )}

      {loading && (!report || view !== 'classes') ? (
        <div className="card"><SkeletonTable rows={8} cols={6} /></div>
      ) : view === 'noclass' ? (
        noClassRows.length === 0 ? (
          <div className="card"><EmptyState title="No No-Class days" description={`No No Class markers for ${campus || 'any campus'} between ${fmtDay(from)} and ${fmtDay(to)}.`} /></div>
        ) : (
          <div className="card">
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: '0 0 0.75rem' }}>
              {noClassRows.length} No Class {noClassRows.length === 1 ? 'day' : 'days'} marked
            </p>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Date</th><th>Campus</th><th>Batches</th><th>Reason</th></tr></thead>
                <tbody>
                  {noClassRows.map((n) => (
                    <tr key={n._id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{fmtDay(n.date)}</td>
                      <td style={{ fontWeight: 600 }}>{n.campusName}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{n.batchNames.length ? n.batchNames.join(', ') : 'Whole campus'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{n.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : view === 'whole' ? (
        wholeRows.length === 0 ? (
          <div className="card"><EmptyState title="No days" description="Nothing to show for this range." /></div>
        ) : (
          <div className="card">
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: '0 0 0.75rem' }}>
              Every day from {fmtDay(from)} to {fmtDay(wholeDaysEnd(to))}, campus by campus — all faculty, all types.
            </p>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Date</th><th>Campus</th><th>Status</th><th style={{ textAlign: 'right' }}>Entries</th><th style={{ textAlign: 'right' }}>Time</th><th>Details</th></tr></thead>
                <tbody>
                  {wholeRows.map((w) => (
                    <tr key={`${w.campusName}|${w.date}`}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{fmtDay(w.date)}</td>
                      <td style={{ fontWeight: 600 }}>{w.campusName}</td>
                      <td>
                        <span className={`badge ${w.status === 'Classes' ? 'badge-green' : w.status === 'Not submitted' ? 'badge-red' : 'badge-gray'}`}>{w.status}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{w.entries || '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{w.entries ? formatHM(w.hours) : '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{w.detail || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState title="No entries" description={`No ${kindLabel} entries for ${campus || 'any campus'} between ${fmtDay(from)} and ${fmtDay(to)}.`} />
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: '0 0 0.75rem' }}>
            {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · <strong style={{ color: 'var(--color-text)' }}>{formatHM(sumHours(rows))}</strong> in total
          </p>
          {group === 'faculty' && byFaculty.map(([facultyId, list]) => (
            // Faculty-wise: one block per faculty with all their sessions, across every campus and batch.
            <div key={facultyId} className="card" style={{ marginBottom: '1rem' }}>
              <GroupHeader
                title={`${list[0].facultyName} · ${typeLabel(list[0].facultyType)} · ${list[0].subject}`}
                count={list.length}
                hours={sumHours(list)}
              />
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', margin: '0 0 0.75rem' }}>
                {Array.from(groupBy(list, (r) => r.campusName).entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([campusName, campusList]) => (
                    <span key={campusName} className="badge badge-gray">
                      {campusName}: {campusList.length} · {formatHM(sumHours(campusList))}
                    </span>
                  ))}
              </div>
              {table(list, ['faculty'])}
            </div>
          ))}

          {group !== 'faculty' && byCampus.map(([campusName, campusRows]) => (
            <div key={campusName} className="card" style={{ marginBottom: '1rem' }}>
              <GroupHeader title={campusName} count={campusRows.length} hours={sumHours(campusRows)} />

              {group === 'campus' && table(campusRows, ['campus'])}

              {group === 'subject' && Array.from(groupBy(campusRows, (r) => r.subject).entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([subject, list]) => (
                  <div key={subject}>
                    <GroupHeader title={subject} count={list.length} hours={sumHours(list)} level={2} />
                    {table(list, ['campus', 'subject'])}
                  </div>
                ))}
            </div>
          ))}
        </>
      )}

      {editing && accessToken && (
        <EditEntryDialog
          entry={editing}
          accessToken={accessToken}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
