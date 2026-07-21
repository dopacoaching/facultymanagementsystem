import Link from 'next/link'
import type { Session } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { STATUS_BADGE } from './types'

interface RecentSessionsCardProps {
  sessions: Session[]
  onLogSession: () => void
}

export function RecentSessionsCard({ sessions, onLogSession }: RecentSessionsCardProps) {
  return (
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
          action={{ label: 'Log Session', onClick: onLogSession }}
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
  )
}
