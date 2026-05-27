'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getSessions } from '@/services/session.service'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Session } from '@/types'
import type { Batch } from '@/services/faculty.service'
import Link from 'next/link'

const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
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
  const { accessToken } = useAppSelector((s) => s.auth)
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [batches,   setBatches]   = useState<Batch[]>([])

  // Chapter summary per batch (aggregated on client side)
  const [chapterSummary, setChapterSummary] = useState<ChapterSummary[]>([])

  useEffect(() => {
    if (!accessToken) return
    getSessions({}, accessToken).then(setSessions).catch(console.error)
    apiFetch<Schedule[]>('/academics/schedules', { token: accessToken }).then(setSchedules).catch(console.error)
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'INTEGRATED_SCHOOL')
      setBatches(ac)

      // Load chapter stats for Residential + Online batches (video-first matters)
      const videoFirstBatches = ac.filter((b) => isVideoFirstBatch(b.type))
      Promise.all(
        videoFirstBatches.map((b) =>
          apiFetch<{_id:string;videoComplete:boolean;facultyClassDone:boolean}[]>(
            `/academics/chapters?batchId=${b._id}`, { token: accessToken! }
          ).then((chs) => ({
            batchId:        b._id,
            totalChapters:  chs.length,
            videoComplete:  chs.filter((c) => c.videoComplete).length,
            facultyClassDone: chs.filter((c) => c.facultyClassDone).length,
            pendingVideo:   chs.filter((c) => c.facultyClassDone && !c.videoComplete).length,
          }))
        )
      ).then(setChapterSummary).catch(console.error)
    }).catch(console.error)
  }, [accessToken])

  const todayStr  = new Date().toISOString().slice(0, 10)
  const today     = sessions.filter((s) => s.sessionDate?.startsWith(todayStr))
  const completed = sessions.filter((s) => s.status === 'COMPLETED')
  const cancelled = sessions.filter((s) => s.status === 'CANCELLED')
  const scheduled = sessions.filter((s) => s.status === 'SCHEDULED')

  const unpublishedSchedules = schedules.filter((s) => !s.isPublished)
  const recentPublished      = schedules.filter((s) => s.isPublished).slice(0, 3)

  // Batches with pending video (need attention)
  const pendingVideoBatches = chapterSummary.filter((cs) => cs.pendingVideo > 0)

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

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
                      <span className={`badge ${cs.pendingVideo > 0 ? 'badge-yellow' : 'badge-green'}`} style={{ fontSize: '0.7rem' }}>
                        {cs.pendingVideo > 0 ? `${cs.pendingVideo} pending video` : 'All videos done'}
                      </span>
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
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">📅</div>
            <p>No sessions logged yet</p>
          </div>
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
