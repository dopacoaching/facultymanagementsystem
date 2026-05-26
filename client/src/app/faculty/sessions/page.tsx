'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/session.service'
import type { Session } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
}

export default function FacultySessionsPage() {
  const { accessToken, facultyId } = useAppSelector((s) => s.auth)
  const [sessions, setSessions] = useState<Session[]>([])
  const [filter, setFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('ALL')

  useEffect(() => {
    if (accessToken && facultyId) {
      getAll({ facultyId }, accessToken).then(setSessions).catch(console.error)
    }
  }, [accessToken, facultyId])

  const filtered = filter === 'ALL' ? sessions : sessions.filter((s) => s.status === filter)

  const filterOptions: { key: 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'; label: string }[] = [
    { key: 'ALL',       label: `All (${sessions.length})` },
    { key: 'SCHEDULED', label: `Upcoming (${sessions.filter(s => s.status === 'SCHEDULED').length})` },
    { key: 'COMPLETED', label: `Completed (${sessions.filter(s => s.status === 'COMPLETED').length})` },
    { key: 'CANCELLED', label: `Cancelled (${sessions.filter(s => s.status === 'CANCELLED').length})` },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>My Sessions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {filtered.length} session{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="card">
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              className="btn btn-sm"
              style={{
                background: filter === key ? 'var(--color-primary)' : 'transparent',
                color: filter === key ? '#fff' : 'var(--color-text-secondary)',
                border: `1.5px solid ${filter === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                boxShadow: filter === key ? '0 2px 8px rgba(79,70,229,.25)' : 'none',
              }}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No sessions found</h3>
            <p>{filter === 'ALL' ? 'No sessions recorded yet' : `No ${filter.toLowerCase()} sessions`}</p>
          </div>
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
