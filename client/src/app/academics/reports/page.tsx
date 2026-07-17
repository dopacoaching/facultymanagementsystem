'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'
import type { Session } from '@/types'
import { SkeletonTable } from '@/components/ui/Skeleton'
import {
  BatchChapter, MONTHS, Report, downloadCsv, fmtDate, toCsv,
  ReportSelector, ChapterCompletionReport, PendingVideoReport, FacultyActivityReport,
} from '@/components/academics/reports'

export default function AcademicsReportsPage() {
  const { accessToken } = useAppSelector((s) => s.auth)

  const [report, setReport] = useState<Report>('chapters')
  const [batches, setBatches] = useState<Batch[]>([])
  const [batchId, setBatchId] = useState('')

  // Chapter report state
  const [chapters,    setChapters]   = useState<BatchChapter[]>([])
  const [chLoading,   setChLoading]  = useState(false)

  // Faculty activity state
  const [sessions,    setSessions]   = useState<Session[]>([])
  const [sessLoading, setSessLoading] = useState(false)
  const [actMonth,    setActMonth]   = useState<number>(new Date().getMonth() + 1)
  const [actYear,     setActYear]    = useState<number>(new Date().getFullYear())

  useEffect(() => {
    if (!accessToken) return
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'IG')
      setBatches(ac)
      if (ac.length) setBatchId(ac[0]._id)
    }).catch(console.error)
  }, [accessToken])

  // Load chapters when batchId changes for chapter-related reports
  useEffect(() => {
    if (!accessToken || !batchId || (report !== 'chapters' && report !== 'pending-video')) return
    setChLoading(true)
    apiFetch<BatchChapter[]>(`/academics/chapters?batchId=${batchId}`, { token: accessToken })
      .then(setChapters)
      .catch(console.error)
      .finally(() => setChLoading(false))
  }, [accessToken, batchId, report])

  // Load sessions for faculty activity report
  useEffect(() => {
    if (!accessToken || report !== 'faculty-activity') return
    setSessLoading(true)
    const url = batchId
      ? `/academics/sessions?batchId=${batchId}&month=${actMonth}&year=${actYear}`
      : `/academics/sessions?month=${actMonth}&year=${actYear}`
    apiFetch<Session[]>(url, { token: accessToken })
      .then(setSessions)
      .catch(console.error)
      .finally(() => setSessLoading(false))
  }, [accessToken, batchId, report, actMonth, actYear])

  // ── Chapter completion stats ─────────────────────────────────────────────
  const chapterStats = useMemo(() => {
    const bySubject: Record<string, { total: number; videoComplete: number; classComplete: number; pending: number }> = {}
    for (const c of chapters) {
      if (!bySubject[c.subject]) bySubject[c.subject] = { total: 0, videoComplete: 0, classComplete: 0, pending: 0 }
      bySubject[c.subject].total++
      if (c.videoComplete) bySubject[c.subject].videoComplete++
      if (c.facultyClassDone) bySubject[c.subject].classComplete++
      if (!c.videoComplete && !c.facultyClassDone) bySubject[c.subject].pending++
    }
    return Object.entries(bySubject).sort(([a], [b]) => a.localeCompare(b))
  }, [chapters])

  // ── Pending video chapters ───────────────────────────────────────────────
  const pendingVideoChapters = useMemo(() =>
    chapters.filter((c) => !c.videoComplete).sort((a, b) => a.subject.localeCompare(b.subject) || a.chapterOrder - b.chapterOrder),
    [chapters])

  // ── Faculty activity (sessions grouped by faculty) ───────────────────────
  const facultyActivity = useMemo(() => {
    const map: Record<string, { name: string; sessions: number; hours: number; completed: number; cancelled: number }> = {}
    for (const s of sessions) {
      if (!s.facultyId) continue
      const fid = typeof s.facultyId === 'object' ? s.facultyId._id : s.facultyId
      const fname = typeof s.facultyId === 'object' ? s.facultyId.name : s.facultyId
      if (!map[fid]) map[fid] = { name: fname, sessions: 0, hours: 0, completed: 0, cancelled: 0 }
      map[fid].sessions++
      map[fid].hours += s.durationHours
      if (s.status === 'COMPLETED') map[fid].completed++
      if (s.status === 'CANCELLED') map[fid].cancelled++
    }
    return Object.values(map).sort((a, b) => b.hours - a.hours)
  }, [sessions])

  // ── Export functions ─────────────────────────────────────────────────────

  function exportChapters() {
    const bName = batches.find((b) => b._id === batchId)?.name ?? batchId
    const rows: string[][] = [
      ['Batch', 'Subject', 'Chapter', 'Order', 'Video Complete', 'Video Date', 'Class Done', 'Class Date'],
      ...chapters.map((c) => [
        bName,
        c.subject,
        c.chapterName,
        String(c.chapterOrder || ''),
        c.videoComplete ? 'Yes' : 'No',
        fmtDate(c.videoCompletedAt),
        c.facultyClassDone ? 'Yes' : 'No',
        fmtDate(c.facultyClassDoneAt),
      ])
    ]
    downloadCsv(toCsv(rows), `chapters-${bName.replace(/\s+/g, '-')}-${todayLocal()}.csv`)
  }

  function exportPendingVideo() {
    const bName = batches.find((b) => b._id === batchId)?.name ?? batchId
    const rows: string[][] = [
      ['Batch', 'Subject', 'Chapter', 'Class Done?', 'Class Date'],
      ...pendingVideoChapters.map((c) => [
        bName,
        c.subject,
        c.chapterName,
        c.facultyClassDone ? 'Yes' : 'No',
        fmtDate(c.facultyClassDoneAt),
      ])
    ]
    downloadCsv(toCsv(rows), `pending-video-${bName.replace(/\s+/g, '-')}-${todayLocal()}.csv`)
  }

  function exportFacultyActivity() {
    const bName = batches.find((b) => b._id === batchId)?.name ?? 'All Batches'
    const rows: string[][] = [
      ['Faculty', 'Total Sessions', 'Total Hours', 'Completed', 'Cancelled'],
      ...facultyActivity.map((f) => [
        f.name,
        String(f.sessions),
        f.hours.toFixed(1),
        String(f.completed),
        String(f.cancelled),
      ]),
      ['', '', '', '', ''],
      ['TOTAL', String(sessions.length), sessions.reduce((s,x) => s + x.durationHours, 0).toFixed(1), '', ''],
    ]
    downloadCsv(toCsv(rows), `faculty-activity-${bName.replace(/\s+/g,'-')}-${MONTHS[actMonth-1]}-${actYear}.csv`)
  }

  const isLoading = chLoading || sessLoading

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Academics Reports</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Chapter completion, pending video, and faculty activity summaries
          </p>
        </div>
      </div>

      <ReportSelector
        report={report} onReportChange={setReport}
        batches={batches} batchId={batchId} onBatchChange={setBatchId}
        actMonth={actMonth} onMonthChange={setActMonth}
        actYear={actYear} onYearChange={setActYear}
      />

      {isLoading && (
        <div className="card">
          <SkeletonTable rows={6} cols={7} />
        </div>
      )}

      {!isLoading && report === 'chapters' && (
        <ChapterCompletionReport chapters={chapters} chapterStats={chapterStats} onExport={exportChapters} />
      )}

      {!isLoading && report === 'pending-video' && (
        <PendingVideoReport pendingVideoChapters={pendingVideoChapters} onExport={exportPendingVideo} />
      )}

      {!isLoading && report === 'faculty-activity' && (
        <FacultyActivityReport
          sessions={sessions} facultyActivity={facultyActivity}
          actMonth={actMonth} actYear={actYear}
          onExport={exportFacultyActivity}
        />
      )}
    </div>
  )
}
