import Link from 'next/link'
import type { Session } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { STATUS_BADGE } from './types'
import s from './Dashboard.module.css'

interface RecentSessionsCardProps {
  sessions: Session[]
}

export function RecentSessionsCard({ sessions }: RecentSessionsCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Recent AC Sessions</h2>
        <Link href="/academics/sessions" className={s.viewAll}>View all &rarr;</Link>
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          iconName="book"
          title="No sessions logged yet"
          description="Sessions will appear here once coordinators start logging classes."
        />
      ) : (
        <div className="table-wrapper table-stack">
          <table>
            <thead>
              <tr><th>Faculty</th><th>Subject</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {sessions.slice(0, 6).map((x) => (
                <tr key={x._id}>
                  <td data-label="Faculty" style={{ fontWeight: 500 }}>
                    {(typeof x.facultyId === 'object' ? x.facultyId?.name : x.facultyId) ?? '—'}
                  </td>
                  <td data-label="Subject">{x.subject}</td>
                  <td data-label="Date" className="num" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(x.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${STATUS_BADGE[x.status] ?? 'badge-gray'}`}>
                      {x.status.replace(/_/g, ' ')}
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
