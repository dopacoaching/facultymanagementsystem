import { Fragment } from 'react'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { Icon } from '@/components/ui/Icon'
import { CATEGORY_BADGE, EVENT_ICON, ROLE_LABEL, fmtDate } from './types'
import type { AuditLogEntry } from './types'
import s from './AuditLog.module.css'

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
        iconName="shield"
        title="No audit events found"
        description="Try adjusting the filters above. Events are recorded automatically as actions are taken in the system."
      />
    )
  }

  return (
    <div className="table-wrapper table-stack" aria-busy={loading}>
      <table>
        <thead>
          <tr>
            <th style={{ width: 100 }}>Ref #</th>
            <th style={{ width: 110 }}>Category</th>
            <th>Description</th>
            <th style={{ width: 140 }}>Target</th>
            <th style={{ width: 140 }}>Actor</th>
            <th style={{ width: 150 }}>Time</th>
            <th style={{ width: 44 }}><span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Details</span></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isOpen = expanded === log._id
            const icon = EVENT_ICON[log.eventType] ?? 'log'
            return (
              <Fragment key={log._id}>
                <tr
                  onClick={() => onToggleExpand(log._id)}
                  className={`${s.row} ${isOpen ? s.rowOpen : ''}`}>
                  <td data-label="Ref #" className={s.ref}>
                    {log.referenceNumber}
                  </td>
                  <td data-label="Category">
                    <span className={`badge ${CATEGORY_BADGE[log.category] ?? 'badge-gray'}`}>
                      {log.category}
                    </span>
                  </td>
                  <td data-label="Description">
                    <div className={s.eventCell}>
                      <Icon name={icon} size={16} className={s.eventIcon} />
                      <div>
                        <div className={s.desc}>{log.description || log.reason || '—'}</div>
                        {(log.amount ?? 0) > 0 && (
                          <div className={s.amount}>
                            ₹{(log.amount ?? 0).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td data-label="Target">
                    {log.targetName ? (
                      <div className={s.twoLine}>
                        <div className={s.twoLineMain}>{log.targetName}</div>
                        {log.targetType && <div className={s.twoLineSub}>{log.targetType}</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td data-label="Actor">
                    <div className={s.twoLine}>
                      <div className={s.twoLineMain}>
                        {log.actorUsername ?? (log.actorUserId ? log.actorUserId.slice(-8) : '—')}
                      </div>
                      <div className={s.twoLineSub}>
                        {log.actorRole ? (ROLE_LABEL[log.actorRole] ?? log.actorRole) : '—'}
                      </div>
                    </div>
                  </td>
                  <td data-label="Time" className={s.time}>
                    {fmtDate(log.timestamp)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm btn-icon ${s.toggle} ${isOpen ? s.toggleOpen : ''}`}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Hide details' : 'Show details'}
                      onClick={(e) => { e.stopPropagation(); onToggleExpand(log._id) }}
                    >
                      <Icon name="chevronDown" size={16} />
                    </button>
                  </td>
                </tr>

                {/* Expanded detail row (read-only) */}
                {isOpen && (
                  <tr key={`${log._id}-detail`}>
                    <td colSpan={7} className={s.detailCell}>
                      <div className={s.detail}>
                        <div>
                          <div className={s.detailLabel}>Event</div>
                          <code className={s.code}>{log.eventType}</code>
                        </div>
                        <div>
                          <div className={s.detailLabel}>Actor ID</div>
                          <code className={s.code}>{log.actorUserId ?? '—'}</code>
                        </div>
                        {log.targetId && (
                          <div>
                            <div className={s.detailLabel}>Target ID</div>
                            <code className={s.code}>{log.targetId}</code>
                          </div>
                        )}
                        {log.cancellationInitiator && (
                          <div>
                            <div className={s.detailLabel}>Cancelled By</div>
                            <span className="badge badge-yellow">{log.cancellationInitiator}</span>
                          </div>
                        )}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div style={{ minWidth: 0 }}>
                            <div className={s.detailLabel}>Metadata</div>
                            <pre className={s.pre}>
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
