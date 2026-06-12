'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { getAll as getSessions, getFacultyHoursSummary } from '@/services/session.service'
import type { FacultyHoursItem } from '@/services/session.service'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Session } from '@/types'
import type { Batch } from '@/services/faculty.service'
import Link from 'next/link'
import { Skeleton, EmptyState } from '@/components/ui/Skeleton'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
}

const HOURS_STATUS_BADGE: Record<string, string> = {
  MET:      'badge-green',
  ON_TRACK: 'badge-blue',
  AT_RISK:  'badge-yellow',
  MISSED:   'badge-red',
  NO_QUOTA: 'badge-gray',
}

interface Schedule {
  _id: string
  batchId: string | { _id: string; name: string }
  weekStartDate: string
  weekEndDate: string
  mondayExamTopic?: string
  fridayExamTopic?: string
  isPublished: boolean
}

interface ChapterSummary {
  batchId: string
  totalChapters: number
  videoComplete: number
  facultyClassDone: number
  pendingVideo: number  // facultyClassDone but !videoComplete (Residential/Online concern)
}

export default function AcademicsDashboard() {
  const router = useRouter()
  const { accessToken } = useAppSelector((s) => s.auth)
  const now = new Date()
  const [hoursMonth, setHoursMonth] = useState(now.getMonth() + 1)
  const [hoursYear,  setHoursYear]  = useState(now.getFullYear())
  const [facultyHours,        setFacultyHours]        = useState<FacultyHoursItem[]>([])
  const [facultyHoursLoading, setFacultyHoursLoading] = useState(false)
  const hoursReqRef = useRef(0)

  const [sessions,  setSessions]  = useState<Session[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [batches,   setBatches]   = useState<Batch[]>([])

  // Chapter summary per batch (aggregated on client side)
  const [chapterSummary, setChapterSummary] = useState<ChapterSummary[]>([])

  useEffect(() => {
    if (!accessToken) return
    loadFacultyHours(hoursMonth, hoursYear)
  }, [accessToken]) // eslint-disable-line

  function loadFacultyHours(m: number, y: number) {
    if (!accessToken) return
    const reqId = ++hoursReqRef.current
    setFacultyHoursLoading(true)
    getFacultyHoursSummary(m, y, accessToken)
      .then((data) => { if (reqId === hoursReqRef.current) setFacultyHours(data.faculty) })
      .catch(console.error)
      .finally(() => { if (reqId === hoursReqRef.current) setFacultyHoursLoading(false) })
  }

  useEffect(() => {
    if (!accessToken) return
    getSessions({}, accessToken).then(setSessions).catch(console.error)
    apiFetch<Schedule[]>('/academics/schedules', { token: accessToken }).then(setSchedules).catch(console.error)
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'IG')
      setBatches(ac)

      // Load chapter stats for Residential + Online batches using a single
      // aggregate query instead of N parallel per-batch requests.
      const videoFirstBatches = ac.filter((b) => isVideoFirstBatch(b.type))
      if (videoFirstBatches.length > 0) {
        const ids = videoFirstBatches.map((b) => b._id).join(',')
        apiFetch<ChapterSummary[]>(`/academics/chapters/summary?batchIds=${ids}`, { token: accessToken! })
          .then(setChapterSummary)
          .catch(console.error)
      }
    }).catch(console.error)
  }, [accessToken])

  const todayStr  = todayLocal()
  const today     = sessions.filter((s) => s.sessionDate?.startsWith(todayStr))
  const completed = sessions.filter((s) => s.status === 'COMPLETED')
  const cancelled = sessions.filter((s) => s.status === 'CANCELLED')
  const scheduled = sessions.filter((s) => s.status === 'SCHEDULED')

  const unpublishedSchedules = schedules.filter((s) => !s.isPublished)
  const recentPublished      = schedules.filter((s) => s.isPublished).slice(0, 3)

  // Batches with pending video (need attention)
  const pendingVideoBatches = chapterSummary.filter((cs) => cs.pendingVideo > 0)

  // Quota warnings — faculty who are AT_RISK or MISSED
  const quotaWarnings = facultyHours.filter((f) => f.status === 'AT_RISK' || f.status === 'MISSED')

  function getBatchName(b: string | { _id: string; name: string }): string {
    if (typeof b === 'object') return b.name
    return batches.find((bt) => bt._id === b)?.name ?? b
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      {/* Stats row */}
      <div className="stats-grid">
        {[
          { label: 'Total Sessions',  value: sessions.length,  icon: '📚', color: 'var(--color-primary)' },
          { label: "Today's",         value: today.length,     icon: '📅', color: 'var(--color-accent)' },
          { label: 'Completed',       value: completed.length, icon: '✅', color: 'var(--color-success)' },
          { label: 'Scheduled',       value: scheduled.length, icon: '⏳', color: 'var(--color-info)' },
          { label: 'Cancelled',       value: cancelled.length, icon: '❌', color: 'var(--color-danger)' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color }}>{value}</div>
              </div>
              <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quota Warnings ──────────────────────────────────────────────── */}
      {quotaWarnings.length > 0 && (
        <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {quotaWarnings.map((f) => {
            const isMissed = f.status === 'MISSED'
            return (
              <div
                key={String(f.facultyId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap',
                  padding: '0.875rem 1.125rem',
                  borderRadius: 'var(--radius-md)',
                  background: isMissed ? 'rgba(239,68,68,.08)' : 'rgba(245,158,11,.08)',
                  border: `1px solid ${isMissed ? 'rgba(239,68,68,.25)' : 'rgba(245,158,11,.25)'}`,
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{isMissed ? '🚨' : '⚠️'}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: isMissed ? 'var(--color-danger)' : '#92400e' }}>
                    {f.name}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginLeft: '0.375rem' }}>
                    ({f.subject})
                  </span>
                  <span style={{ color: isMissed ? 'var(--color-danger)' : '#b45309', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                    — {f.logged.toFixed(1)}h logged of {f.quota}h required
                    {f.deficit != null && f.deficit > 0 && ` · ${f.deficit.toFixed(1)}h short`}
                  </span>
                </div>
                <span className={`badge ${isMissed ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                  {isMissed ? 'Quota Missed' : 'At Risk'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Faculty Hours vs Contract ────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2>Faculty Hours</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input"
              value={hoursMonth}
              onChange={(e) => { const m = +e.target.value; setHoursMonth(m); loadFacultyHours(m, hoursYear) }}
              style={{ minWidth: 90, padding: '0.3rem 0.5rem', fontSize: '0.8125rem' }}
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input
              type="number"
              className="input"
              value={hoursYear}
              onChange={(e) => { const y = +e.target.value; setHoursYear(y); loadFacultyHours(hoursMonth, y) }}
              style={{ width: 80, padding: '0.3rem 0.5rem', fontSize: '0.8125rem' }}
            />
          </div>
        </div>

        {facultyHoursLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[100, 80, 95, 70, 85].map((w, i) => (
              <Skeleton key={i} height={32} style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : facultyHours.length === 0 ? (
          <EmptyState
            icon="⏱"
            title="No faculty hours for this month"
            description="Hours will appear here once sessions are logged for the selected month."
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Subject</th>
                  <th>Contract</th>
                  <th style={{ textAlign: 'right' }}>Logged</th>
                  <th style={{ textAlign: 'right' }}>Quota</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {facultyHours.map((f) => (
                  <tr key={String(f.facultyId)}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{f.name}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{f.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {f.contractType.replace(/_/g, ' ')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-primary)' }}>
                      {f.logged.toFixed(1)}h
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem' }}>
                      {f.quota != null ? `${f.quota}h` : '—'}
                    </td>
                    <td style={{ minWidth: 100 }}>
                      {f.quota != null && f.pct != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(f.pct, 100)}%`,
                              background: f.pct >= 100 ? 'var(--color-success)' : f.pct >= 70 ? 'var(--color-primary)' : f.pct >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
                              borderRadius: 3,
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{f.pct}%</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${HOURS_STATUS_BADGE[f.status] ?? 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                        {f.status === 'NO_QUOTA' ? 'Hourly' : f.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel-grid-2" style={{ marginBottom: '1.25rem' }}>

        {/* ── Pending video chapters alert ─────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2>🎬 Video Status</h2>
            <Link href="/academics/chapters" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>
          {chapterSummary.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
              No chapter data loaded yet. Chapters are seeded when sessions are logged.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {chapterSummary.map((cs) => {
                const batch = batches.find((b) => b._id === cs.batchId)
                if (!batch) return null
                return (
                  <div key={cs.batchId} style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: cs.pendingVideo > 0 ? '1px solid rgba(245,158,11,.3)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{batch.name}</span>
                      {cs.pendingVideo > 0 ? (
                        <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>
                          {cs.pendingVideo} pending video
                        </span>
                      ) : cs.totalChapters > 0 && cs.videoComplete === cs.totalChapters ? (
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>All videos done</span>
                      ) : cs.videoComplete > 0 ? (
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{cs.videoComplete}/{cs.totalChapters} videos done</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                      {cs.videoComplete}/{cs.totalChapters} video complete · {cs.facultyClassDone}/{cs.totalChapters} class done
                    </div>
                  </div>
                )
              })}
              {pendingVideoBatches.length > 0 && (
                <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(245,158,11,.08)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#92400e' }}>
                  ⚠ {pendingVideoBatches.length} batch{pendingVideoBatches.length !== 1 ? 'es' : ''} have sessions done before video was marked complete.
                  This won&apos;t block future sessions but may indicate a workflow gap.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Schedule status ──────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h2>🗓 Schedules</h2>
            <Link href="/academics/schedule" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>
          {unpublishedSchedules.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
                Unpublished Drafts
              </div>
              {unpublishedSchedules.slice(0, 3).map((s) => (
                <div key={s._id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{getBatchName(s.batchId as string | {_id:string;name:string})}</span>
                  <span style={{ color: 'var(--color-muted)', marginLeft: '0.5rem' }}>week of {fmtDate(s.weekStartDate)}</span>
                </div>
              ))}
            </div>
          )}
          {recentPublished.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
                Recently Published
              </div>
              {recentPublished.map((s) => (
                <div key={s._id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,.06)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{getBatchName(s.batchId as string | {_id:string;name:string})}</span>
                  <span style={{ color: 'var(--color-muted)', marginLeft: '0.5rem' }}>week of {fmtDate(s.weekStartDate)}</span>
                </div>
              ))}
            </div>
          )}
          {schedules.length === 0 && (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No schedules created yet.</p>
          )}
        </div>
      </div>

      {/* ── Recent sessions ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2>Recent Sessions</h2>
          <Link href="/academics/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No sessions logged yet"
            description="Log the first session to see recent activity here."
            action={{ label: 'Log Session', onClick: () => router.push('/academics/sessions') }}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Faculty</th><th>Subject</th><th>Chapter</th><th>Hrs</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 500 }}>
                      {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                    </td>
                    <td>{s.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{s.chapter}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.durationHours}</td>
                    <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
