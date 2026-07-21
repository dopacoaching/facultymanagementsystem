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
        <h2>Recent Sessions</h2>
        <Link href="/faculty/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          View all →
        </Link>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No sessions yet"
          description="Your sessions will appear here once they are logged by the coordinator."
        />
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
              {sessions.slice(0, 8).map((s) => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>{s.subject}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.chapter}
                  </td>
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
  )
}
