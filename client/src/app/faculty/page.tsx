'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/session.service'
import type { Session } from '@/types'
import Link from 'next/link'

const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
}

export default function FacultyDashboard() {
  const { accessToken, facultyId } = useAppSelector((s) => s.auth)
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    if (accessToken && facultyId) {
      getAll({ facultyId }, accessToken).then(setSessions).catch(console.error)
    }
  }, [accessToken, facultyId])

  const upcoming  = sessions.filter((s) => s.status === 'SCHEDULED')
  const completed = sessions.filter((s) => s.status === 'COMPLETED')
  const totalHours = completed.reduce((sum, s) => sum + s.durationHours, 0)

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Upcoming',     value: upcoming.length,       icon: '⏳', color: 'var(--color-accent)' },
          { label: 'Completed',    value: completed.length,      icon: '✅', color: 'var(--color-success)' },
          { label: 'Total Hours',  value: totalHours.toFixed(1), icon: '⏱', color: 'var(--color-primary)' },
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

      {/* Sessions */}
      <div className="card">
        <div className="card-header">
          <h2>My Sessions</h2>
          <Link href="/faculty/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No sessions yet</h3>
            <p>Your sessions will appear here</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Date</th>
                  <th>Hrs</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{s.chapter}</td>
                    <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.durationHours}</td>
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
