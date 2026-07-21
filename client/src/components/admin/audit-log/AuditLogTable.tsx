import { Fragment } from 'react'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { CATEGORY_BADGE, EVENT_ICON, ROLE_LABEL, fmtDate } from './types'
import type { AuditLogEntry } from './types'

interface AuditLogTableProps {
  loading: boolean
  logs: AuditLogEntry[]
  expanded: string | null
  onToggleExpand: (id: string) => void
}

export function AuditLogTable({ loading, logs, expanded, onToggleExpand }: AuditLogTableProps) {
  if (loading && logs.length === 0) return <SkeletonTable rows={8} cols={6} />

  if (logs.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No audit events found"
        description="Try adjusting the filters above. Events are recorded automatically as actions are taken in the system."
      />
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style={{ width: 100 }}>Ref #</th>
            <th style={{ width: 110 }}>Category</th>
            <th>Description</th>
            <th style={{ width: 140 }}>Target</th>
            <th style={{ width: 140 }}>Actor</th>
            <th style={{ width: 145 }}>Time</th>
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isOpen = expanded === log._id
            const icon = EVENT_ICON[log.eventType] ?? '📌'
            return (
              <Fragment key={log._id}>
                <tr
                  onClick={() => onToggleExpand(log._id)}
                  style={{ cursor: 'pointer', background: isOpen ? 'var(--color-surface-2)' : undefined }}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                    {log.referenceNumber}
                  </td>
                  <td>
                    <span className={`badge ${CATEGORY_BADGE[log.category] ?? 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                      {log.category}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{log.description || log.reason || '—'}</div>
                        {(log.amount ?? 0) > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '0.125rem' }}>
                            ₹{(log.amount ?? 0).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {log.targetName ? (
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{log.targetName}</div>
                        {log.targetType && <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{log.targetType}</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {log.actorUsername ?? (log.actorUserId ? log.actorUserId.slice(-8) : '—')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                        {log.actorRole ? (ROLE_LABEL[log.actorRole] ?? log.actorRole) : '—'}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {fmtDate(log.timestamp)}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.7rem' }}>
                    {isOpen ? '▲' : '▼'}
                  </td>
                </tr>

                {/* Expanded detail row */}
                {isOpen && (
                  <tr key={`${log._id}-detail`}>
                    <td colSpan={7} style={{ padding: '0 1rem 0.875rem 2.5rem', background: 'var(--color-surface-2)' }}>
                      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '0.75rem 0' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Event</div>
                          <code style={{ fontSize: '0.75rem', background: 'var(--color-surface)', padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                            {log.eventType}
                          </code>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Actor ID</div>
                          <code style={{ fontSize: '0.75rem' }}>{log.actorUserId ?? '—'}</code>
                        </div>
                        {log.targetId && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Target ID</div>
                            <code style={{ fontSize: '0.75rem' }}>{log.targetId}</code>
                          </div>
                        )}
                        {log.cancellationInitiator && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Cancelled By</div>
                            <span className="badge badge-yellow">{log.cancellationInitiator}</span>
                          </div>
                        )}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Metadata</div>
                            <pre style={{ fontSize: '0.72rem', background: 'var(--color-surface)', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border)', margin: 0, maxWidth: 480, overflowX: 'auto' }}>
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
