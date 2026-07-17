import Link from 'next/link'
import type { Session } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { STATUS_BADGE } from './types'

interface RecentSessionsCardProps {
  sessions: Session[]
}

export function RecentSessionsCard({ sessions }: RecentSessionsCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Recent AC Sessions</h2>
        <Link href="/academics/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          View all →
        </Link>
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No sessions logged yet"
          description="Sessions will appear here once coordinators start logging classes."
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Faculty</th><th>Subject</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {sessions.slice(0, 6).map((s) => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 500 }}>
                    {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                  </td>
                  <td>{s.subject}</td>
                  <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                    {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
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
