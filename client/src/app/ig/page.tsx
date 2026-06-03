'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import Link from 'next/link'

interface ISession {
  _id:      string
  facultyId: { name: string } | string | null
  batchId:  string
  subject:  string
  sessionDate: string
  status:   string
}

interface DailySlot {
  _id:      string
  batchId:  { _id: string; name: string } | string
  subject:  string
  chapter:  string
  timeSlot: 'MORNING' | 'AFTERNOON'
  status:   string
  facultyId?: { name: string } | string
}

interface ISChapter {
  _id:     string
  subject: string
  status:  string
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED:         'badge-green',
  CANCELLED:         'badge-red',
  SCHEDULED:         'badge-blue',
  NOT_COMPLETED:     'badge-yellow',
  PLANNED:           'badge-blue',
  NOT_YET_SCHEDULED: 'badge-gray',
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ISDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [sessions, setSessions] = useState<ISession[]>([])
  const [todaySlots, setTodaySlots] = useState<DailySlot[]>([])
  const [chapters, setChapters] = useState<ISChapter[]>([])

  useEffect(() => {
    if (!accessToken) return
    // Load recent sessions
    apiFetch<ISession[]>('/ig/sessions', { token: accessToken })
      .then(setSessions).catch(console.error)
    // Load today's timetable
    apiFetch<{ slots: DailySlot[] }>(
      `/ig/timetable/daily?date=${today()}`,
      { token: accessToken }
    ).then((d) => setTodaySlots(d.slots)).catch(console.error)
    // Load IG Chapters summary (no batchId filter = all)
    apiFetch<ISChapter[]>('/ig/chapters', { token: accessToken })
      .then(setChapters).catch(console.error)
  }, [accessToken])

  const completed = sessions.filter((s) => s.status === 'COMPLETED').length
  const cancelled = sessions.filter((s) => s.status === 'CANCELLED').length
  const chaptersDone = chapters.filter((c) => c.status === 'COMPLETED').length
  const chaptersTotal = chapters.length

  const getBatchName = (bid: DailySlot['batchId']): string =>
    typeof bid === 'object' ? bid.name : String(bid).slice(-6)

  return (
    <div>
      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="stats-grid">
        {[
          { label: 'Total Sessions',    value: sessions.length,  icon: '📚', color: 'var(--color-primary)' },
          { label: 'Completed',         value: completed,        icon: '✅', color: 'var(--color-success)' },
          { label: 'Cancelled',         value: cancelled,        icon: '❌', color: 'var(--color-danger)' },
          { label: 'Chapters Done',     value: `${chaptersDone}/${chaptersTotal}`, icon: '📖', color: 'var(--color-accent)' },
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

      <div className="panel-grid-2" style={{ marginBottom: 0 }}>
        {/* Today's Schedule */}
        <div className="card">
          <div className="card-header">
            <h2>Today&apos;s Schedule</h2>
            <Link href="/ig/timetable" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>
          {todaySlots.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">⏱</div>
              <p>No classes scheduled today</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {todaySlots.map((slot) => (
                <div key={slot._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.625rem 0.5rem', borderRadius: '0.5rem', transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{getBatchName(slot.batchId)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {slot.subject} · {slot.timeSlot}
                      {typeof slot.facultyId === 'object' && slot.facultyId?.name
                        ? ` · ${slot.facultyId.name}` : ''}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[slot.status] ?? 'badge-gray'}`}>
                    {slot.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Sessions</h2>
            <Link href="/ig/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">📅</div>
              <p>No sessions recorded yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {sessions.slice(0, 6).map((s) => (
                <div key={s._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.625rem 0.5rem', borderRadius: '0.5rem', transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                      {' · '}
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chapter progress snapshot */}
      {chaptersTotal > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h2>Chapter Progress</h2>
            <Link href="/ig/chapters" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {['Physics', 'Chemistry', 'Biology'].map((subj) => {
              const subChapters = chapters.filter((c) => c.subject === subj)
              if (!subChapters.length) return null
              const done = subChapters.filter((c) => c.status === 'COMPLETED').length
              const pct  = Math.round((done / subChapters.length) * 100)
              return (
                <div key={subj}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 600 }}>{subj}</span>
                    <span style={{ color: 'var(--color-muted)' }}>{done}/{subChapters.length}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-success)', borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
