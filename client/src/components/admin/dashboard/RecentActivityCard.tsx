import Link from 'next/link'
import type { AuditLog } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { EVENT_BADGE } from './types'

interface RecentActivityCardProps {
  auditLogs: AuditLog[]
}

export function RecentActivityCard({ auditLogs }: RecentActivityCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Recent Activity</h2>
        <Link href="/admin/audit-log" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          View all →
        </Link>
      </div>
      {auditLogs.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No recent activity"
          description="System events will be recorded here as actions are taken."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {auditLogs.map((log) => (
            <div key={log._id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.625rem 0',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <span className={`badge ${EVENT_BADGE[log.eventType] ?? 'badge-gray'}`} style={{ flexShrink: 0, marginTop: '0.15rem' }}>
                {log.eventType.replace(/_/g, ' ')}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.facultyName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {log.amount > 0 && <> · ₹{log.amount.toLocaleString('en-IN')}</>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
