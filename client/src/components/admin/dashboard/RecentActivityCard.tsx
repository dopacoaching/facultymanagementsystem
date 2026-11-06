import Link from 'next/link'
import type { AuditLog } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { EVENT_BADGE } from './types'
import s from './Dashboard.module.css'

interface RecentActivityCardProps {
  auditLogs: AuditLog[]
}

export function RecentActivityCard({ auditLogs }: RecentActivityCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Recent Activity</h2>
        <Link href="/admin/audit-log" className={s.viewAll}>View all &rarr;</Link>
      </div>
      {auditLogs.length === 0 ? (
        <EmptyState
          iconName="history"
          title="No recent activity"
          description="System events will be recorded here as actions are taken."
        />
      ) : (
        <ul className={s.list}>
          {auditLogs.map((log) => (
            <li key={log._id} className={s.activity}>
              <span className={`badge ${EVENT_BADGE[log.eventType] ?? 'badge-gray'} ${s.activityBadge}`}>
                {log.eventType.replace(/_/g, ' ')}
              </span>
              <div className={s.rowText}>
                <div className={s.rowTitle}>{log.facultyName}</div>
                <div className={s.rowSub}>
                  {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {log.amount > 0 && <> · <span className="num">₹{log.amount.toLocaleString('en-IN')}</span></>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
