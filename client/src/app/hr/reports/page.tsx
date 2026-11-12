'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAppSelector } from '@/store/hooks'
import { remove as removeSession } from '@/services/session.service'
import { EditEntryDialog } from '@/components/hr/reports/EditEntryDialog'
import { getEntriesReport, removeNoClass, type EntriesReport, type EntryRow, type NoClassRow } from '@/services/entries.service'
import { EditNoClassDialog } from '@/components/hr/reports/EditNoClassDialog'
import { ErrorAlert, EmptyState, SkeletonTable } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { CLASS_MODE_FILTERS, CLASS_MODE_LABELS as MODE_LABELS } from '@/lib/constants/classModes'
import { useToast } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import s from '@/components/hr/reports/Reports.module.css'
import { toLocalISO } from '@/utils/date'
import { FlagIcon, fmtDay, monthRange } from '@/components/hr/reports/reportShared'
import { useActiveFaculty } from '@/hooks/useActiveFaculty'
import {
  VIEW_TABS, buildWholeDays, groupByCampus, wholeDaysEnd, noClassRowsFor, cleanCell, hmText, downloadSimpleSheet,
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


/** Total break minutes across the morning/lunch/afternoon fields, or null if none was recorded. */
function breakTotal(r: EntryRow): number | null {
  const parts = [r.breakMinutes, r.lunchBreakMinutes, r.afternoonBreakMinutes]
  return parts.every((p) => p == null) ? null : parts.reduce<number>((t, p) => t + (p ?? 0), 0)
}
const breakLabel = (r: EntryRow) => { const t = breakTotal(r); return t == null ? '—' : t === 0 ? 'Nil' : `${t}m` }

/** 'PERMANENT' → 'Permanent'; tolerates a missing type on legacy faculty. */
const typeLabel = (t?: string) => (t ? t.charAt(0) + t.slice(1).toLowerCase() : 'Unknown type')

const sumHours = (rows: EntryRow[]) => rows.reduce((t, r) => t + r.durationHours, 0)

/** Temporary faculty's pay for these rows (₹); rows with no rate set add nothing. */
const sumPay = (rows: EntryRow[]) => rows.reduce((t, r) => t + (r.pay ?? 0), 0)
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

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

function EntryTable({ rows, hideCols, showBatch, showPay, onDelete, onEdit, totals }: { rows: EntryRow[]; hideCols?: ('campus' | 'faculty' | 'subject')[]; showBatch: boolean; showPay: boolean; onDelete?: (r: EntryRow) => void; onEdit?: (r: EntryRow) => void; totals: Map<string, number> }) {
  const showCampus = !hideCols?.includes('campus')
  const showFaculty = !hideCols?.includes('faculty')
  const showSubject = !hideCols?.includes('subject')
  return (
    <div className="table-wrapper table-stack">
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
            <th className="num" style={{ textAlign: 'right' }} title="Total break minutes as entered on the form — not the amount deducted from the time taken.">Break</th>
            <th>Entered by</th>
            <th>Comment</th>
            <th className="num" style={{ textAlign: 'right' }}>Time</th>
            <th className="num" style={{ textAlign: 'right' }} title="This faculty's hours added up in date order, counting only the dates and filters selected above, not their full-period total.">Total so far*</th>
            {showPay && <th className="num" style={{ textAlign: 'right' }} title="Temporary faculty only: hours x the hourly rate in force on that day.">Pay</th>}
            {(onDelete || onEdit) && <th><span className={s.srOnly}>Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td data-label="Date" className={`num ${s.nowrap} ${s.muted}`}>{fmtDay(r.date)}</td>
              {showCampus && <td data-label="Campus" className={s.muted}>{r.campusName}</td>}
              {showBatch && <td data-label="Batch" className={s.muted}>{r.batchName || '—'}</td>}
              {showFaculty && <td data-label="Faculty" className={s.strong}>{r.facultyName}</td>}
              {showSubject && <td data-label="Subject" className={s.muted}>{r.subject}</td>}
              <td data-label="Chapter" className={s.muted}>{r.chapter || '—'}</td>
              <td data-label="Class mode" className={s.nowrap}>{r.classMode ? MODE_LABELS[r.classMode] ?? r.classMode : '—'}</td>
              <td data-label="Start–End" className={`num ${s.nowrap}`}>{r.startTime ? `${r.startTime}–${r.endTime || '—'}` : '—'}</td>
              <td data-label="Break" className={`num ${s.nowrap}`} style={{ textAlign: 'right' }}>{breakLabel(r)}</td>
              <td data-label="Entered by" className={s.muted}>{r.updatedByName || '—'}</td>
              <td data-label="Comment" className={s.comment}>{r.comment || '—'}</td>
              <td data-label="Time" className={`num ${s.nowrap} ${s.strong}`} style={{ textAlign: 'right' }}>
                {r.entryType && <span className={`badge ${r.entryType === 'SHOOT' ? 'badge-blue' : 'badge-gray'} ${s.entryTag}`}>{r.entryType === 'SHOOT' ? 'Shoot' : 'Live'}</span>}{formatHM(r.durationHours)}
              </td>
              <td data-label="Total so far*" className={`num ${s.nowrap} ${s.muted}`} style={{ textAlign: 'right' }}>{formatHM(totals.get(r._id) ?? r.durationHours)}</td>
              {showPay && (
                <td data-label="Pay" className={`num ${s.nowrap} ${s.strong}`} style={{ textAlign: 'right' }}
                  title={r.payRate != null ? `${formatHM(r.durationHours)} at ${rupees(r.payRate)}/hr` : undefined}>
                  {r.facultyType !== 'TEMPORARY' ? <span className={s.faint}>—</span>
                    : r.pay != null ? rupees(r.pay)
                    : <span className="badge badge-yellow">Rate not set</span>}
                </td>
              )}
              {(onDelete || onEdit) && (
                <td className={s.nowrap}>
                  <div className={s.rowActions}>
                    {onEdit && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => onEdit(r)}>
                        <Icon name="edit" size={14} /> Edit
                      </button>
                    )}
                    {onDelete && <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(r)}>Delete</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupHeader({ title, count, hours, pay, level = 1 }: { title: string; count: number; hours: number; pay?: number; level?: 1 | 2 }) {
  return (
    <div className={`${s.groupHead} ${level === 2 ? s.groupHeadSub : ''}`}>
      {level === 1 ? <h3 className={s.groupTitle}>{title}</h3> : <h4 className={s.groupTitleSub}>{title}</h4>}
      <span className={s.groupMeta}>
        <span><strong>{count}</strong> {count === 1 ? 'entry' : 'entries'}</span>
        <span>Total <strong>{formatHM(hours)}</strong></span>
        {pay != null && pay > 0 && <span>Pay <strong>{rupees(pay)}</strong></span>}
      </span>
    </div>
  )
}

/** Tab-separated text for the current view, ready to paste into a sheet. */
function toTSV(rows: EntryRow[], totals: Map<string, number>, showPay: boolean): string {
  const hmOf = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }
  const head = ['Date', 'Campus', 'Batch', 'Faculty', 'Faculty type', 'Subject', 'Chapter', 'Class mode', 'Start', 'End', 'Break entered (min)', 'Entered by', 'Entry type', 'Time (h:mm)', 'Hours', 'Comment', 'Total so far (h:mm)', ...(showPay ? ['Pay (INR)'] : [])]
  // Neutralise spreadsheet formulas (=, +, -, @) in coordinator-typed text.
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, ' ').replace(/^[=+\-@]/, "'$&")
  const lines = rows.map((r) => {
    const mins = Math.round(r.durationHours * 60)
    return [
      r.date, r.campusName, r.batchName, r.facultyName, r.facultyType, r.subject, r.chapter,
      r.classMode ? MODE_LABELS[r.classMode] ?? r.classMode : '', r.startTime, r.endTime, breakTotal(r) ?? '', r.updatedByName, r.entryType ? (r.entryType === 'SHOOT' ? 'Shoot' : 'Live') : '',
      `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`, r.durationHours.toFixed(2), r.comment, hmOf(totals.get(r._id) ?? r.durationHours),
      ...(showPay ? [r.pay ?? ''] : []),
    ].map((v) => clean(String(v))).join('\t')
  })
  return [head.join('\t'), ...lines].join('\n')
}

/** One sheet laid out like the screen: a bold header row per group (with its entry
 *  count and total hours), that group's entries in date order, then a blank row.
 *  Loaded on demand so the xlsx writer stays out of the page's initial bundle. */
async function downloadExcel(rows: EntryRow[], group: GroupBy, from: string, to: string, totals: Map<string, number>, showPay: boolean, campus = '') {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const head = ['Date', 'Campus', 'Batch', 'Faculty', 'Faculty type', 'Subject', 'Chapter', 'Class mode', 'Entry type',
    'Start', 'End', 'Break entered (min)', 'Entered by', 'Time (h:mm)', 'Hours', 'Comment', 'Total so far (h:mm)', ...(showPay ? ['Pay (INR)'] : [])]
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
      ...(showPay ? [{ value: r.pay ?? undefined, type: Number, format: '#,##0' }] : []),
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
    if (showPay) { const pay = sumPay(list); if (pay > 0) r[17] = cell(pay, { format: '#,##0' }) }
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
    for (const [campusName, campusRows] of Array.from(groupByCampus(rows, campus).entries()).sort(byName)) {
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
  /** '' = every class mode; otherwise one of Online, Offline or the two doubt-clearance modes. */
  const [classMode, setClassMode] = useState('')
  /** '' = all entries; the joint options pick all, IG-school or repeaters-campus joint classes; 'SINGLE' leaves joint classes out. */
  const [jointFilter, setJointFilter] = useState<'' | 'JOINT' | 'JOINT_IG' | 'JOINT_REP' | 'SINGLE'>('')
  /** Class days (entries) / No class markers / Whole days (every campus-day's status). */
  const [view, setView]       = useState<ReportView>('classes')
  /** One faculty of the chosen type; '' = all of that type. */
  const [facultyId, setFacultyId] = useState('')
  const allFaculty = useActiveFaculty(accessToken)

  const canCopy = role === 'ADMIN'
  const canDelete = role === 'ADMIN' || role === 'HR_MANAGER'

  const [editing, setEditing] = useState<EntryRow | null>(null)
  const [editingNoClass, setEditingNoClass] = useState<NoClassRow | null>(null)

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

  async function deleteNoClass(n: NoClassRow) {
    if (!accessToken || !window.confirm(`Remove the No Class marker for ${n.campusName} on ${fmtDay(n.date)}? The day will show as "report not submitted" again.`)) return
    try {
      await removeNoClass(n._id, accessToken)
      toast.success('No Class removed', n.campusName)
    } catch (e: unknown) {
      toast.error('Could not remove', e instanceof Error ? e.message : undefined)
    }
    await load()   // also when it was already gone: show the current list
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

  /** Every filter except class mode, so a faculty's running total counts all of their hours. */
  const baseRows = useMemo(() => {
    const all = report?.sessions ?? []
    return all
      .filter((r) => kind === 'ALL' || (kind === 'PERMANENT') === (r.facultyType === 'PERMANENT'))
      .filter((r) => !campus || r.campusNames.includes(campus))
      .filter((r) => !facultyId || r.facultyId === facultyId)
      .sort(byEntryOrder)
  }, [report, kind, campus, facultyId])
  const rows = useMemo(() => baseRows
    .filter((r) => !classMode || r.classMode === classMode)
    .filter((r) => {
      switch (jointFilter) {
        case 'JOINT':     return r.isJoint
        case 'JOINT_IG':  return r.isJoint && r.isIG
        case 'JOINT_REP': return r.isJoint && !r.isIG
        case 'SINGLE':    return !r.isJoint
        default:          return true
      }
    }),
  [baseRows, classMode, jointFilter])

  /** HR/Admin only (the server decides): a Pay column for temporary faculty, when the shown rows include any. */
  const showPay = !!report?.showPay && rows.some((r) => r.facultyType === 'TEMPORARY')

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

  /** Each faculty's hours added up in date order across the filtered rows (6h, then 12h, then 17h...), whatever the class mode. */
  const totals = useMemo(() => cumulativeHours(baseRows), [baseRows])

  const byCampus = useMemo(() => {
    if (group === 'faculty') return []
    const map = groupByCampus(rows, campus)
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [rows, group, campus])

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
        ? toTSV(rows, totals, showPay)
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
        await downloadExcel(rows, exportBy, from, to, totals, showPay, campus)
      }
    } catch {
      toast.error('Download failed', 'The Excel file could not be created.')
    }
  }

  /** One place decides the table's shared props, so the faculty and campus layouts can't drift apart. */
  const table = (list: EntryRow[], hideCols: ('campus' | 'faculty' | 'subject')[]) => (
    <EntryTable rows={list} hideCols={hideCols} showBatch={showBatch} showPay={showPay} onDelete={canDelete ? deleteEntry : undefined} onEdit={canDelete ? setEditing : undefined} totals={totals} />
  )

  const kindLabel = KIND_TABS.find((t) => t.key === kind)!.label.toLowerCase()
  const facultyCount = new Set(rows.map((r) => r.facultyId)).size
  const campusCount = groupByCampus(rows, campus).size
  const missingDayCount = (report?.missing ?? []).filter((m) => !campus || m.campusName === campus).reduce((n, m) => n + m.dates.length, 0)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Entries Report</h1>
          <p className="page-subtitle">
            Sessions pushed by each campus — <span className="mono">{fmtDay(from)}</span> to <span className="mono">{fmtDay(to)}</span>.
          </p>
        </div>
        <div className="page-head-actions">
          <Link href="/hr/reports/not-submitted" className="btn btn-outline">
            <Icon name="alert" size={16} /> Reports not submitted
          </Link>
          {sheetCount > 0 && (
            <>
              {canCopy && (
                <button type="button" className="btn btn-outline" onClick={copyData} title="Copy the entries below as tab-separated text">
                  <Icon name="list" size={16} /> Copy data
                </button>
              )}
              {view === 'classes' && (
                <select className={`input ${s.inlineSelect}`} aria-label="Excel layout" value={exportBy} onChange={(e) => setExportChoice(e.target.value as GroupBy)}>
                  {GROUP_TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              )}
              <button type="button" className="btn btn-primary" onClick={exportExcel} title="Download the entries below as an Excel file, laid out as chosen">
                <Icon name="download" size={16} /> Download Excel
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="stack-sm" style={{ marginBottom: 'var(--space-4)' }}><ErrorAlert message={error} onRetry={load} /></div>}

      {/* Overview first: totals for the range and filters below. */}
      {report && view === 'classes' && (
        <div className={`stats-grid ${s.kpis}`} aria-live="polite">
          <div className="stat-card">
            <div className="stat-label">Entries</div>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-sub">{kindLabel}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total time</div>
            <div className="stat-value">{formatHM(sumHours(rows))}</div>
            <div className="stat-sub">{sumHours(rows).toFixed(2)} hours</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Faculty</div>
            <div className="stat-value">{facultyCount}</div>
            <div className="stat-sub">across {campusCount} {campusCount === 1 ? 'campus' : 'campuses'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Days not submitted</div>
            <div className="stat-value">{missingDayCount}</div>
            <div className="stat-sub">
              {missingDayCount > 0
                ? <Link href="/hr/reports/not-submitted">Flagged — view details</Link>
                : 'None flagged'}
            </div>
          </div>
          {showPay && sumPay(rows) > 0 && (
            <div className="stat-card">
              <div className="stat-label">Temporary pay</div>
              <div className="stat-value">{rupees(sumPay(rows))}</div>
              <div className="stat-sub">hours x rate in force</div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className={s.filters}>
        <div className={s.filterRow}>
          <div className="form-group" style={{ margin: 0 }}>
            <span className="label" id="er-view-label">Report</span>
            <div className="segmented" role="group" aria-labelledby="er-view-label">
              {VIEW_TABS.map((t) => (
                <button key={t.key} type="button" aria-pressed={view === t.key} onClick={() => setView(t.key)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className={`form-group ${s.field}`}>
            <label className="label" htmlFor="er-month">Month</label>
            <input id="er-month" type="month" className="input" max={toLocalISO(now).slice(0, 7)}
              value={from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : ''}
              onChange={(e) => pickMonth(e.target.value)} />
          </div>
          <div className={`form-group ${s.fieldWide}`}>
            <label className="label" htmlFor="er-campus">Campus</label>
            <select id="er-campus" className="input" value={campus} onChange={(e) => setCampus(e.target.value)}>
              <option value="">All campuses</option>
              {(report?.campuses ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {view === 'classes' && (
            <div className={`form-group ${s.fieldWide}`}>
              <label className="label" htmlFor="er-mode">Class mode</label>
              <select id="er-mode" className="input" value={classMode} onChange={(e) => setClassMode(e.target.value)}>
                <option value="">All modes</option>
                {CLASS_MODE_FILTERS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}
          {view === 'classes' && (
            <div className={`form-group ${s.fieldWide}`}>
              <label className="label" htmlFor="er-joint">Joint classes</label>
              <select id="er-joint" className="input" value={jointFilter} onChange={(e) => setJointFilter(e.target.value as typeof jointFilter)}>
                <option value="">All entries</option>
                <option value="JOINT">All joint classes</option>
                <option value="JOINT_IG">IG joint classes</option>
                <option value="JOINT_REP">Repeaters joint classes</option>
                <option value="SINGLE">Without joint classes</option>
              </select>
            </div>
          )}
          {view === 'classes' && (
            <div className={`form-group ${s.fieldWide}`}>
              <label className="label" htmlFor="er-faculty">Faculty</label>
              <select id="er-faculty" className="input" value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
                <option value="">{kind === 'PERMANENT' ? 'All permanent faculty' : kind === 'TEMPORARY' ? 'All temporary faculty' : 'All faculty'}</option>
                {facultyChoices.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className={s.filterRow}>
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} loading={loading} onApply={load} applyLabel="Refresh" maxDays={93} />
        </div>
      </div>

      {/* View switches */}
      {view === 'classes' && (
        <div className={s.strip}>
          <div className="segmented" role="group" aria-label="Faculty type">
            {KIND_TABS.map((t) => (
              <button key={t.key} type="button" aria-pressed={kind === t.key} onClick={() => { setKind(t.key); setFacultyId('') }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="segmented" role="group" aria-label="Group entries by">
            {GROUP_TABS.map((t) => (
              <button key={t.key} type="button" aria-pressed={group === t.key} onClick={() => setGroup(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {report?.truncated && (
        <div className="alert alert-warning" style={{ marginBottom: 'var(--space-4)' }}>
          <span className="alert-icon"><Icon name="alert" size={16} /></span>
          This range has more entries than can be shown. Narrow the dates to see everything.
        </div>
      )}

      {loading && (!report || view !== 'classes') ? (
        <div className="card card-flush"><SkeletonTable rows={8} cols={6} /></div>
      ) : view === 'noclass' ? (
        noClassRows.length === 0 ? (
          <div className="card"><EmptyState title="No No-Class days" description={`No No Class markers for ${campus || 'any campus'} between ${fmtDay(from)} and ${fmtDay(to)}.`} /></div>
        ) : (
          <div className="card card-flush">
            <div className="card-header">
              <h2>No Class days</h2>
              <span className="badge badge-gray"><span className="mono">{noClassRows.length}</span> No Class {noClassRows.length === 1 ? 'day' : 'days'} marked</span>
            </div>
            <div className="table-wrapper table-stack" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}>
              <table>
                <thead><tr><th>Date</th><th>Campus</th><th>Batches</th><th>Reason</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {noClassRows.map((n) => (
                    <tr key={n._id}>
                      <td data-label="Date" className={`num ${s.nowrap} ${s.muted}`}>{fmtDay(n.date)}</td>
                      <td data-label="Campus" className={s.strong}>{n.campusName}</td>
                      <td data-label="Batches" className={s.muted}>{n.batchNames.length ? n.batchNames.join(', ') : 'Whole campus'}</td>
                      <td data-label="Reason" className={s.muted}>{n.reason || '—'}</td>
                      <td>
                        <div className={s.rowActions}>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingNoClass(n)}>
                            <Icon name="edit" size={14} /> Edit
                          </button>
                          {canDelete && (
                            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => deleteNoClass(n)}>Delete</button>
                          )}
                        </div>
                      </td>
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
          <div className="card card-flush">
            <div className="card-header">
              <h2>Day by day</h2>
              <span className={s.groupMeta}>
                <span><span className="mono">{fmtDay(from)}</span> to <span className="mono">{fmtDay(wholeDaysEnd(to))}</span>, campus by campus — all faculty, all types</span>
              </span>
            </div>
            <div className="table-wrapper table-stack" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}>
              <table>
                <thead><tr><th>Date</th><th>Campus</th><th>Status</th><th className="num" style={{ textAlign: 'right' }}>Entries</th><th className="num" style={{ textAlign: 'right' }}>Time</th><th>Details</th></tr></thead>
                <tbody>
                  {wholeRows.map((w) => (
                    <tr key={`${w.campusName}|${w.date}`}>
                      <td data-label="Date" className={`num ${s.nowrap} ${s.muted}`}>{fmtDay(w.date)}</td>
                      <td data-label="Campus" className={s.strong}>{w.campusName}</td>
                      <td data-label="Status">
                        <span className={`badge ${w.status === 'Classes' ? 'badge-green' : w.status === 'Not submitted' ? 'badge-red' : 'badge-gray'}`}>
                          {w.status === 'Not submitted' && <FlagIcon />}{w.status}
                        </span>
                      </td>
                      <td data-label="Entries" className="num" style={{ textAlign: 'right' }}>{w.entries || '—'}</td>
                      <td data-label="Time" className={`num ${s.strong}`} style={{ textAlign: 'right' }}>{w.entries ? formatHM(w.hours) : '—'}</td>
                      <td data-label="Details" className={s.muted}>{w.detail || '—'}</td>
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
          {group === 'faculty' && byFaculty.map(([facultyId, list]) => (
            // Faculty-wise: one block per faculty with all their sessions, across every campus and batch.
            <div key={facultyId} className={`card card-flush ${s.group}`}>
              <GroupHeader
                title={`${list[0].facultyName} · ${typeLabel(list[0].facultyType)} · ${list[0].subject}`}
                count={list.length}
                hours={sumHours(list)}
                pay={showPay ? sumPay(list) : undefined}
              />
              <div className={s.groupChips}>
                {Array.from(groupByCampus(list, campus).entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([campusName, campusList]) => (
                    <span key={campusName} className="badge badge-gray">
                      {campusName}: <span className="mono">{campusList.length} · {formatHM(sumHours(campusList))}</span>
                    </span>
                  ))}
              </div>
              <div className={s.groupBody} style={{ paddingTop: 'var(--space-3)' }}>{table(list, ['faculty'])}</div>
            </div>
          ))}

          {group !== 'faculty' && byCampus.map(([campusName, campusRows]) => (
            <div key={campusName} className={`card card-flush ${s.group}`}>
              <GroupHeader title={campusName} count={campusRows.length} hours={sumHours(campusRows)} />

              {group === 'campus' && <div className={s.groupBody}>{table(campusRows, ['campus'])}</div>}

              {group === 'subject' && Array.from(groupBy(campusRows, (r) => r.subject).entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([subject, list]) => (
                  <div key={subject}>
                    <GroupHeader title={subject} count={list.length} hours={sumHours(list)} level={2} />
                    <div className={s.groupBody}>{table(list, ['campus', 'subject'])}</div>
                  </div>
                ))}
            </div>
          ))}

          <p className={s.subline} style={{ marginTop: 'var(--space-3)' }}>
            Grand total: <strong className="mono">{rows.length}</strong> {rows.length === 1 ? 'entry' : 'entries'} · <strong className="mono">{formatHM(sumHours(rows))}</strong>
            {showPay && sumPay(rows) > 0 && <> · temporary faculty pay <strong className="mono">{rupees(sumPay(rows))}</strong></>}
          </p>
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

      {editingNoClass && accessToken && (
        <EditNoClassDialog
          row={editingNoClass}
          accessToken={accessToken}
          onClose={() => setEditingNoClass(null)}
          onSaved={() => { setEditingNoClass(null); load() }}
        />
      )}
    </div>
  )
}
