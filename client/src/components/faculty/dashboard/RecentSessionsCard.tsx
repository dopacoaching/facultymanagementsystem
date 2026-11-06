import Link from 'next/link'
import type { Session } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { Icon } from '@/components/ui/Icon'
import { STATUS_BADGE } from './types'
import s from '../Portal.module.css'

interface RecentSessionsCardProps {
  sessions: Session[]
}

export function RecentSessionsCard({ sessions }: RecentSessionsCardProps) {
  return (
    <div className="card card-flush">
      <div className="card-header">
        <h2>Recent Sessions</h2>
        <Link href="/faculty/sessions" className={s.sectionLink}>
          View all <Icon name="chevronRight" size={12} />
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className={s.cardBody}>
          <EmptyState
            title="No sessions yet"
            description="Your sessions will appear here once they are logged by the coordinator."
          />
        </div>
      ) : (
        <div className={`table-wrapper table-stack ${s.flatTable}`}>
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
              {sessions.slice(0, 8).map((sess) => (
                <tr key={sess._id}>
                  <td data-label="Subject" className={s.strong}>{sess.subject}</td>
                  <td data-label="Chapter" className={s.chapter}>{sess.chapter}</td>
                  <td data-label="Date" className={`${s.muted} ${s.nowrap}`}>
                    {new Date(sess.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td data-label="Hrs" className="num">{sess.durationHours}h</td>
                  <td data-label="Status">
                    <span className={`badge badge-dot ${STATUS_BADGE[sess.status] ?? 'badge-gray'}`}>
                      {sess.status.replace(/_/g, ' ')}
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
