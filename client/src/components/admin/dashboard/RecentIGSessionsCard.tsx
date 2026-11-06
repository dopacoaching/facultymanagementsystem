import Link from 'next/link'
import { EmptyState } from '@/components/ui/Skeleton'
import { ISession, STATUS_BADGE } from './types'
import s from './Dashboard.module.css'

interface RecentIGSessionsCardProps {
  sessions: ISession[]
}

export function RecentIGSessionsCard({ sessions }: RecentIGSessionsCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Recent IG Sessions</h2>
        <Link href="/hr/reports/ig-sessions" className={s.viewAll}>View all &rarr;</Link>
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          iconName="school"
          title="No IG sessions yet"
          description="IG sessions will appear here once they are logged."
        />
      ) : (
        <ul className={s.list}>
          {sessions.slice(0, 6).map((x) => (
            <li key={x._id} className={s.row}>
              <div className={s.rowText}>
                <div className={s.rowTitle}>{x.subject}</div>
                <div className={s.rowSub}>
                  {(typeof x.facultyId === 'object' ? x.facultyId?.name : x.facultyId) ?? '—'}
                  {' · '}
                  <span className="num">{new Date(x.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                </div>
              </div>
              <span className={`badge ${STATUS_BADGE[x.status] ?? 'badge-gray'}`}>
                {x.status.replace(/_/g, ' ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
