'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/session.service'
import { apiFetch } from '@/services/api'
import type { Session } from '@/types'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassEntryDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
type SessionType   = 'LIVE_SESSION' | 'RECORDED_VIDEO' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

interface ClassEntry {
  day: ClassEntryDay
  subject: string
  chapter: string
  sessionType: SessionType
  durationHours?: number
  facultyId?: string | { _id: string; name: string; subject: string }
  notes?: string
  sessionDate?: string
  startTime?: string
  examDay?: 'MONDAY' | 'FRIDAY'
  examDate?: string
}

interface WeeklySchedule {
  _id: string
  batchId: string | { _id: string; name: string }
  weekStartDate: string
  weekEndDate: string
  mondayExamTopic?: string
  fridayExamTopic?: string
  classEntries: ClassEntry[]
  isPublished: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_ORDER: ClassEntryDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

const DAY_LABELS: Record<ClassEntryDay, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
}

const SESSION_LABELS: Record<SessionType, string> = {
  LIVE_SESSION: 'Live Session', RECORDED_VIDEO: 'Recorded Video',
  WEEKLY_EXAM: 'Weekly Exam', MONTHLY_EXAM: 'Monthly Exam',
}

const SESSION_BADGE: Record<SessionType, { cls: string; icon: string }> = {
  LIVE_SESSION:   { cls: 'badge-blue',   icon: '🎓' },
  RECORDED_VIDEO: { cls: 'badge-purple', icon: '🎬' },
  WEEKLY_EXAM:    { cls: 'badge-orange', icon: '📝' },
  MONTHLY_EXAM:   { cls: 'badge-red',    icon: '📋' },
}

const DAY_COLOR: Record<ClassEntryDay, string> = {
  MONDAY: '#6366f1', TUESDAY: '#0ea5e9', WEDNESDAY: '#10b981',
  THURSDAY: '#f59e0b', FRIDAY: '#ec4899', SATURDAY: '#8b5cf6', SUNDAY: '#ef4444',
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'badge-green', CANCELLED: 'badge-red',
  SCHEDULED: 'badge-blue', NOT_COMPLETED: 'badge-yellow',
}

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getFacultyId(f: ClassEntry['facultyId']): string | undefined {
  if (!f) return undefined
  return typeof f === 'object' ? f._id : f
}

function getBatchName(b: WeeklySchedule['batchId']): string {
  if (!b) return '—'
  return typeof b === 'object' ? b.name : b
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacultySessionsPage() {
  const { accessToken, facultyId, batchId: myBatchId } = useAppSelector((s) => s.auth)

  // Session log state
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [filter,    setFilter]    = useState<'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('ALL')

  // Schedule state
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!accessToken || !facultyId) return
    const schedUrl = myBatchId
      ? `/academics/schedules?batchId=${myBatchId}`
      : '/academics/schedules'

    Promise.all([
      getAll({ facultyId }, accessToken),
      apiFetch<WeeklySchedule[]>(schedUrl, { token: accessToken }),
    ]).then(([sess, scheds]) => {
      setSessions(sess)
      setSchedules(scheds.filter((s) => s.isPublished))
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, facultyId, myBatchId])

  // ── Derive current week schedule ──────────────────────────────────────────

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const currentSchedule = useMemo(() =>
    schedules.find((s) => new Date(s.weekStartDate) <= today && new Date(s.weekEndDate) >= today)
    ?? schedules.find((s) => new Date(s.weekStartDate) > today) // next upcoming if no current
  , [schedules, today])

  // ── Upcoming published schedules (current + future) ───────────────────────

  const upcomingSchedules = useMemo(() =>
    [...schedules]
      .filter((s) => new Date(s.weekEndDate) >= today)
      .sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime())
  , [schedules, today])

  // ── Session log ───────────────────────────────────────────────────────────

  const filtered = filter === 'ALL' ? sessions : sessions.filter((s) => s.status === filter)

  const filterOptions: { key: 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'; label: string }[] = [
    { key: 'ALL',       label: `All (${sessions.length})` },
    { key: 'SCHEDULED', label: `Upcoming (${sessions.filter((s) => s.status === 'SCHEDULED').length})` },
    { key: 'COMPLETED', label: `Completed (${sessions.filter((s) => s.status === 'COMPLETED').length})` },
    { key: 'CANCELLED', label: `Cancelled (${sessions.filter((s) => s.status === 'CANCELLED').length})` },
  ]

  if (loading) {
    return (
      <div className="card">
        <SkeletonTable rows={6} cols={5} />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>My Sessions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Weekly schedule &amp; your session log
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — UPCOMING WEEKLY SCHEDULES                              */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-muted)' }}>
          📅 Upcoming Schedule
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      {upcomingSchedules.length === 0 ? (
        <div className="card" style={{ marginBottom: '1.5rem', color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>
          No published schedules yet. Check back later.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
          {upcomingSchedules.map((s) => {
            const isCurrent = new Date(s.weekStartDate) <= today && new Date(s.weekEndDate) >= today
            const batchName = getBatchName(s.batchId)

            // Group entries by day
            const byDay: Partial<Record<ClassEntryDay, ClassEntry[]>> = {}
            s.classEntries.forEach((e) => {
              if (!byDay[e.day]) byDay[e.day] = []
              byDay[e.day]!.push(e)
            })
            const days = DAY_ORDER.filter((d) => byDay[d]?.length)

            // Count my entries
            const myCount = s.classEntries.filter((e) => getFacultyId(e.facultyId) === facultyId).length

            return (
              <div key={s._id} className="card" style={{
                borderLeft: `4px solid ${isCurrent ? 'var(--color-success)' : 'var(--color-primary)'}`,
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700 }}>{batchName}</span>
                      {isCurrent && <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>📍 This Week</span>}
                      {myCount > 0 && (
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                          🎓 {myCount} session{myCount > 1 ? 's' : ''} assigned to you
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                      {fmt(s.weekStartDate)} → {fmt(s.weekEndDate)}
                    </div>
                  </div>
                </div>

                {/* Exam topics */}
                {(s.mondayExamTopic || s.fridayExamTopic) && (
                  <div style={{
                    display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
                    padding: '0.575rem 0.875rem',
                    background: 'rgba(245,158,11,.08)',
                    border: '1px solid rgba(245,158,11,.2)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.875rem',
                  }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#d97706', width: '100%', marginBottom: '0.1rem' }}>
                      📝 Weekly Exams
                    </div>
                    {s.mondayExamTopic && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.1rem' }}>Monday</div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.mondayExamTopic}</div>
                      </div>
                    )}
                    {s.fridayExamTopic && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.1rem' }}>Friday</div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.fridayExamTopic}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Day-by-day timetable */}
                {days.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {days.map((day) => {
                      const entries = byDay[day]!
                      const color   = DAY_COLOR[day]
                      return (
                        <div key={day}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color }} />
                            {DAY_LABELS[day]}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem' }}>
                            {entries.map((e, i) => {
                              const badge = SESSION_BADGE[e.sessionType]
                              const isExam = e.sessionType === 'WEEKLY_EXAM' || e.sessionType === 'MONTHLY_EXAM'
                              const isMe   = getFacultyId(e.facultyId) === facultyId
                              return (
                                <div key={i} style={{
                                  display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap',
                                  padding: '0.45rem 0.7rem',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.875rem',
                                  background: isMe
                                    ? 'linear-gradient(90deg,rgba(99,102,241,.12),rgba(99,102,241,.04))'
                                    : 'var(--color-surface-2)',
                                  border: isMe ? '1px solid rgba(99,102,241,.3)' : '1px solid transparent',
                                }}>
                                  <span className={`badge ${badge.cls}`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                                    {badge.icon} {SESSION_LABELS[e.sessionType]}
                                  </span>
                                  {isExam && e.examDate && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{fmt(e.examDate)}</span>
                                  )}
                                  {!isExam && e.sessionDate && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 500 }}>
                                      📅 {new Date(e.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                  {!isExam && e.startTime && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                      🕒 {e.startTime}
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 600 }}>{e.subject}</span>
                                  <span style={{ color: 'var(--color-text-secondary)' }}>— {e.chapter}</span>
                                  {e.durationHours && (
                                    <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', marginLeft: 'auto' }}>⏱ {e.durationHours}h</span>
                                  )}
                                  {!isExam && e.facultyId && (
                                    <span style={{ fontSize: '0.75rem', color: isMe ? 'var(--color-primary)' : 'var(--color-muted)', fontWeight: isMe ? 700 : 400, flexShrink: 0 }}>
                                      👤 {typeof e.facultyId === 'object' ? e.facultyId.name : 'Assigned'}
                                      {isMe && ' (you)'}
                                    </span>
                                  )}
                                  {e.notes && (
                                    <span style={{ width: '100%', fontSize: '0.75rem', color: 'var(--color-muted)' }}>📌 {e.notes}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No class entries for this week.</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — SESSION LOG                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-muted)' }}>
          🗂 Session Log
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      <div className="card">
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              className="btn btn-sm"
              style={{
                background:  filter === key ? 'var(--color-primary)' : 'transparent',
                color:       filter === key ? '#fff' : 'var(--color-text-secondary)',
                border:      `1.5px solid ${filter === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                boxShadow:   filter === key ? '0 2px 8px rgba(79,70,229,.25)' : 'none',
              }}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No sessions found"
            description={filter === 'ALL' ? 'No sessions recorded yet. Sessions will appear here once logged.' : `No ${filter.toLowerCase().replace('_', ' ')} sessions. Try changing the filter.`}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{s.chapter}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.durationHours}h</td>
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
