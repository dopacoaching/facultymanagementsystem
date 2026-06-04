'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'

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
  examDay?: 'MONDAY' | 'FRIDAY'
  examDate?: string
}

interface Batch {
  _id: string
  name: string
  type: string
}

interface Schedule {
  _id: string
  batchId: string | Batch
  weekStartDate: string
  weekEndDate: string
  mondayExamTopic?: string
  fridayExamTopic?: string
  classEntries: ClassEntry[]
  isPublished: boolean
  publishedAt?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_ORDER: ClassEntryDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

const DAY_LABELS: Record<ClassEntryDay, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
}

const SESSION_LABELS: Record<SessionType, string> = {
  LIVE_SESSION:   'Live Session',
  RECORDED_VIDEO: 'Recorded Video',
  WEEKLY_EXAM:    'Weekly Exam',
  MONTHLY_EXAM:   'Monthly Exam',
}

const SESSION_BADGE: Record<SessionType, { cls: string; icon: string }> = {
  LIVE_SESSION:   { cls: 'badge-blue',   icon: '🎓' },
  RECORDED_VIDEO: { cls: 'badge-purple', icon: '🎬' },
  WEEKLY_EXAM:    { cls: 'badge-orange', icon: '📝' },
  MONTHLY_EXAM:   { cls: 'badge-red',    icon: '📋' },
}

const DAY_COLOR: Partial<Record<ClassEntryDay, string>> = {
  MONDAY:    '#6366f1',
  TUESDAY:   '#0ea5e9',
  WEDNESDAY: '#10b981',
  THURSDAY:  '#f59e0b',
  FRIDAY:    '#ec4899',
  SATURDAY:  '#8b5cf6',
  SUNDAY:    '#ef4444',
}

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getFacultyId(f: ClassEntry['facultyId']): string | undefined {
  if (!f) return undefined
  if (typeof f === 'object') return f._id
  return f
}

function getBatchName(b: Schedule['batchId']): string {
  if (!b) return '—'
  if (typeof b === 'object') return b.name
  return b
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacultySchedulePage() {
  const { accessToken, facultyId, batchId: myBatchId } = useAppSelector((s) => s.auth)

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<'upcoming' | 'all'>('upcoming')

  useEffect(() => {
    if (!accessToken) return
    const url = myBatchId
      ? `/academics/schedules?batchId=${myBatchId}`
      : '/academics/schedules'

    apiFetch<Schedule[]>(url, { token: accessToken })
      .then((data) => {
        // Only show published schedules to faculty
        const published = data
          .filter((s) => s.isPublished)
          .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())
        setSchedules(published)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, myBatchId])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingSchedules = useMemo(() =>
    schedules.filter((s) => new Date(s.weekEndDate) >= today),
    [schedules] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const displayList = tab === 'upcoming' ? upcomingSchedules : schedules

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>My Schedule</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Published weekly timetables for your batch
          </p>
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', padding: '0.25rem' }}>
          {(['upcoming', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '0.375rem 0.875rem',
                borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: tab === t ? 'var(--color-primary)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {t === 'upcoming' ? '⏳ Upcoming' : '📅 All'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {displayList.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🗓</div>
            <h3>{tab === 'upcoming' ? 'No upcoming schedules' : 'No published schedules'}</h3>
            <p>
              {tab === 'upcoming'
                ? 'Check back later or switch to "All" to view past schedules.'
                : 'Published schedules will appear here.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Schedule cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {displayList.map((s) => {
          const batchName = getBatchName(s.batchId)
          const isCurrent = new Date(s.weekStartDate) <= today && new Date(s.weekEndDate) >= today

          // Group entries by day in week order
          const byDay: Partial<Record<ClassEntryDay, ClassEntry[]>> = {}
          s.classEntries.forEach((e) => {
            if (!byDay[e.day]) byDay[e.day] = []
            byDay[e.day]!.push(e)
          })
          const days = DAY_ORDER.filter((d) => byDay[d]?.length)

          // My entries (assigned to this faculty)
          const myEntries = s.classEntries.filter((e) => {
            const fid = getFacultyId(e.facultyId)
            return fid && fid === facultyId
          })

          return (
            <div key={s._id} className="card" style={{
              borderLeft: `4px solid ${isCurrent ? 'var(--color-success)' : 'var(--color-primary)'}`,
              position: 'relative',
            }}>
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{batchName}</span>
                    {isCurrent && (
                      <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>📍 This Week</span>
                    )}
                    {myEntries.length > 0 && (
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                        🎓 {myEntries.length} session{myEntries.length > 1 ? 's' : ''} assigned to you
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
                  padding: '0.625rem 0.875rem',
                  background: 'rgba(245,158,11,.08)',
                  border: '1px solid rgba(245,158,11,.2)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#d97706', width: '100%', marginBottom: '0.1rem' }}>
                    📝 Weekly Exams
                  </div>
                  {s.mondayExamTopic && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.15rem' }}>Monday</div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.mondayExamTopic}</div>
                    </div>
                  )}
                  {s.fridayExamTopic && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.15rem' }}>Friday</div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.fridayExamTopic}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Day-by-day timetable */}
              {days.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {days.map((day) => {
                    const entries = byDay[day]!
                    const color = DAY_COLOR[day] ?? 'var(--color-primary)'
                    return (
                      <div key={day}>
                        {/* Day label */}
                        <div style={{
                          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.08em', color, marginBottom: '0.375rem',
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
                          {DAY_LABELS[day]}
                        </div>
                        {/* Entries */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '1rem' }}>
                          {entries.map((e, i) => {
                            const badge  = SESSION_BADGE[e.sessionType]
                            const isExam = e.sessionType === 'WEEKLY_EXAM' || e.sessionType === 'MONTHLY_EXAM'
                            const fid    = getFacultyId(e.facultyId)
                            const isMe   = fid && fid === facultyId

                            return (
                              <div key={i} style={{
                                display: 'flex', gap: '0.625rem', alignItems: 'center',
                                padding: '0.5rem 0.75rem',
                                background: isMe
                                  ? 'linear-gradient(90deg, rgba(99,102,241,.12), rgba(99,102,241,.04))'
                                  : 'var(--color-surface-2)',
                                border: isMe ? '1px solid rgba(99,102,241,.25)' : '1px solid transparent',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.875rem',
                                flexWrap: 'wrap',
                              }}>
                                <span className={`badge ${badge.cls}`} style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                                  {badge.icon} {SESSION_LABELS[e.sessionType]}
                                </span>
                                {isExam && e.examDate && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', flexShrink: 0 }}>
                                    {fmt(e.examDate)}
                                  </span>
                                )}
                                <span style={{ fontWeight: 600 }}>{e.subject}</span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>— {e.chapter}</span>
                                {e.durationHours && (
                                  <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', marginLeft: 'auto', flexShrink: 0 }}>
                                    ⏱ {e.durationHours}h
                                  </span>
                                )}
                                {!isExam && e.facultyId && (
                                  <span style={{
                                    fontSize: '0.775rem',
                                    color: isMe ? 'var(--color-primary)' : 'var(--color-muted)',
                                    fontWeight: isMe ? 700 : 400,
                                    flexShrink: 0,
                                    marginLeft: e.durationHours ? '0.5rem' : 'auto',
                                  }}>
                                    👤 {typeof e.facultyId === 'object' ? e.facultyId.name : 'Assigned'}
                                    {isMe && ' (you)'}
                                  </span>
                                )}
                                {e.notes && (
                                  <span style={{ width: '100%', fontSize: '0.775rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
                                    📌 {e.notes}
                                  </span>
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
                <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                  No class entries scheduled for this week.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
