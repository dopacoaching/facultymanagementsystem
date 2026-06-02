'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import type { Batch } from '@/services/faculty.service'
import type { Session } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchChapter {
  _id: string
  batchId: string
  subject: string
  chapterName: string
  chapterOrder: number
  videoComplete: boolean
  videoCompletedAt?: string
  facultyClassDone: boolean
  facultyClassDoneAt?: string
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

type Report = 'chapters' | 'pending-video' | 'faculty-activity'

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
      const ac = list.filter((b) => b.type !== 'INTEGRATED_SCHOOL')
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
    downloadCsv(toCsv(rows), `chapters-${bName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.csv`)
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
    downloadCsv(toCsv(rows), `pending-video-${bName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.csv`)
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

      {/* ── Report selector ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Report</label>
            <select className="input" value={report} onChange={(e) => setReport(e.target.value as Report)} style={{ minWidth: 230 }}>
              <option value="chapters">Chapter Completion Status</option>
              <option value="pending-video">Pending Video Chapters</option>
              <option value="faculty-activity">Monthly Faculty Activity</option>
            </select>
          </div>
          <div>
            <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Batch</label>
            <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)} style={{ minWidth: 200 }}>
              {report === 'faculty-activity' && <option value="">All Batches</option>}
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.type})</option>)}
            </select>
          </div>
          {report === 'faculty-activity' && (
            <>
              <div>
                <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Month</label>
                <select className="input" value={actMonth} onChange={(e) => setActMonth(+e.target.value)} style={{ minWidth: 100 }}>
                  {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label" style={{ marginBottom: '0.25rem', display: 'block' }}>Year</label>
                <input type="number" className="input" value={actYear} min={2020} max={2099} onChange={(e) => setActYear(+e.target.value)} style={{ width: 90 }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Loading spinner ─────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
          <span className="spinner" style={{ display: 'inline-block', width: 28, height: 28, borderWidth: 3 }} />
          <p style={{ marginTop: '0.75rem' }}>Loading data…</p>
        </div>
      )}

      {/* ── Chapter Completion Status ────────────────────────────────────── */}
      {!isLoading && report === 'chapters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary by subject */}
          <div className="card">
            <div className="card-header">
              <h2>Chapter Completion by Subject</h2>
              {chapters.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={exportChapters}>⬇ Export CSV</button>
              )}
            </div>
            {chapterStats.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-icon">📚</div>
                <p>No chapters found for this batch. Log a session to auto-create chapters.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
                  {chapterStats.map(([subject, stats]) => {
                    const videoPct = stats.total > 0 ? Math.round((stats.videoComplete / stats.total) * 100) : 0
                    const classPct = stats.total > 0 ? Math.round((stats.classComplete / stats.total) * 100) : 0
                    return (
                      <div key={subject} style={{ padding: '0.875rem 1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{subject}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '0.375rem' }}>
                          {stats.total} chapters total
                        </div>
                        <div style={{ marginBottom: '0.375rem' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.125rem' }}>
                            🎬 Video: {stats.videoComplete}/{stats.total} ({videoPct}%)
                          </div>
                          <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${videoPct}%`, height: '100%', background: 'var(--color-success)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.125rem' }}>
                            📖 Class: {stats.classComplete}/{stats.total} ({classPct}%)
                          </div>
                          <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${classPct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Full chapter table */}
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Subject</th>
                        <th>Chapter</th>
                        <th style={{ textAlign: 'center' }}>🎬 Video</th>
                        <th>Video Date</th>
                        <th style={{ textAlign: 'center' }}>📖 Class</th>
                        <th>Class Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapters.sort((a, b) => a.subject.localeCompare(b.subject) || a.chapterOrder - b.chapterOrder).map((c) => (
                        <tr key={c._id}>
                          <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>{c.chapterOrder || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{c.subject}</td>
                          <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{c.chapterName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${c.videoComplete ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.7rem' }}>
                              {c.videoComplete ? '✓' : '—'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(c.videoCompletedAt)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${c.facultyClassDone ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                              {c.facultyClassDone ? '✓' : '—'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(c.facultyClassDoneAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Pending Video Report ─────────────────────────────────────────── */}
      {!isLoading && report === 'pending-video' && (
        <div className="card">
          <div className="card-header">
            <h2>Pending Video Chapters ({pendingVideoChapters.length})</h2>
            {pendingVideoChapters.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={exportPendingVideo}>⬇ Export CSV</button>
            )}
          </div>
          {pendingVideoChapters.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">✅</div>
              <h3>All chapters have video complete!</h3>
              <p>No pending video chapters for this batch.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(245,158,11,.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,.25)', fontSize: '0.8125rem', color: '#92400e' }}>
                ⚠ {pendingVideoChapters.length} chapters need their video marked complete before they can be logged for Residential/Online sessions.
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Chapter</th>
                      <th style={{ textAlign: 'center' }}>Class Done?</th>
                      <th>Class Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVideoChapters.map((c) => (
                      <tr key={c._id} style={{ background: c.facultyClassDone ? 'rgba(245,158,11,.04)' : undefined }}>
                        <td style={{ fontWeight: 600 }}>{c.subject}</td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{c.chapterName}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${c.facultyClassDone ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                            {c.facultyClassDone ? '⚠ Class done, no video' : 'Not yet'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>{fmtDate(c.facultyClassDoneAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Monthly Faculty Activity ─────────────────────────────────────── */}
      {!isLoading && report === 'faculty-activity' && (
        <div className="card">
          <div className="card-header">
            <h2>Faculty Activity — {MONTHS[actMonth - 1]} {actYear}</h2>
            {facultyActivity.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={exportFacultyActivity}>⬇ Export CSV</button>
            )}
          </div>
          {facultyActivity.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">📊</div>
              <h3>No sessions found</h3>
              <p>No sessions logged for the selected period.</p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Faculty Active', value: facultyActivity.length, color: 'var(--color-primary)' },
                  { label: 'Total Sessions', value: sessions.length, color: 'var(--color-text)' },
                  { label: 'Total Hours', value: sessions.reduce((s, x) => s + x.durationHours, 0).toFixed(1), color: 'var(--color-success)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: '0.75rem 1.25rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center', flex: '1 1 120px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Faculty</th>
                      <th style={{ textAlign: 'right' }}>Sessions</th>
                      <th style={{ textAlign: 'right' }}>Hours</th>
                      <th style={{ textAlign: 'right' }}>Completed</th>
                      <th style={{ textAlign: 'right' }}>Cancelled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyActivity.map((f) => (
                      <tr key={f.name}>
                        <td style={{ fontWeight: 600 }}>{f.name}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{f.sessions}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{f.hours.toFixed(1)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{f.completed}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {f.cancelled > 0
                            ? <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>{f.cancelled}</span>
                            : <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, borderTop: '2px solid var(--color-border)' }}>
                      <td>Total</td>
                      <td style={{ textAlign: 'right' }}>{sessions.length}</td>
                      <td style={{ textAlign: 'right' }}>{sessions.reduce((s, x) => s + x.durationHours, 0).toFixed(1)}</td>
                      <td style={{ textAlign: 'right' }}>{sessions.filter((s) => s.status === 'COMPLETED').length}</td>
                      <td style={{ textAlign: 'right' }}>{sessions.filter((s) => s.status === 'CANCELLED').length}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
