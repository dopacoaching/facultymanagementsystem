'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import Link from 'next/link'

interface ISession {
  _id: string
  facultyId: { name: string } | string | null
  batchId: string
  subject: string
  sessionDate: string
  status: string
}

interface Slot {
  _id: string
  batchId: string
  dayOfWeek: number
  subject: string
  startTime: string
  endTime: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
}

export default function ISDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [sessions, setSessions] = useState<ISession[]>([])
  const [slots, setSlots] = useState<Slot[]>([])

  useEffect(() => {
    if (!accessToken) return
    apiFetch<ISession[]>('/integrated-school/sessions', { token: accessToken }).then(setSessions).catch(console.error)
    apiFetch<Slot[]>('/integrated-school/timetable', { token: accessToken }).then(setSlots).catch(console.error)
  }, [accessToken])

  const completed = sessions.filter((s) => s.status === 'COMPLETED').length
  const cancelled = sessions.filter((s) => s.status === 'CANCELLED').length

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Sessions',   value: sessions.length, icon: '📚', color: 'var(--color-primary)' },
          { label: 'Completed',        value: completed,       icon: '✅', color: 'var(--color-success)' },
          { label: 'Cancelled',        value: cancelled,       icon: '❌', color: 'var(--color-danger)' },
          { label: 'Timetable Slots',  value: slots.length,    icon: '⏱', color: 'var(--color-accent)' },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Sessions */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Sessions</h2>
            <Link href="/is/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
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
                  padding: '0.625rem 0.5rem',
                  borderRadius: '0.5rem',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
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

        {/* Timetable preview */}
        <div className="card">
          <div className="card-header">
            <h2>Timetable</h2>
            <Link href="/is/timetable" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>
          {slots.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">⏱</div>
              <p>No timetable slots added</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {slots.slice(0, 7).map((slot) => (
                <div key={slot._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '0.7rem', minWidth: 30, justifyContent: 'center' }}>
                      {DAYS[slot.dayOfWeek]}
                    </span>
                    <span style={{ fontWeight: 500 }}>{slot.subject}</span>
                  </div>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                    {slot.startTime}–{slot.endTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
