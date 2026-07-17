import type { Session } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { BATCH_TYPE_BADGE, STATUS_BADGE } from './types'

function getBatchType(batchId: string, batches: Batch[]): string {
  return batches.find((b) => b._id === batchId)?.type ?? ''
}

interface SessionsTableProps {
  loading: boolean
  filtered: Session[]
  totalCount: number
  batches: Batch[]
  canEdit: boolean
  cancelling: string
  cancelInitiator: Record<string, string>
  onCancelInitiatorChange: (id: string, value: string) => void
  onEdit: (s: Session) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
  onNewSession: () => void
}

export function SessionsTable({
  loading, filtered, totalCount, batches, canEdit, cancelling, cancelInitiator,
  onCancelInitiatorChange, onEdit, onMarkComplete, onCancel, onNewSession,
}: SessionsTableProps) {
  return (
    <div className="card">
      {loading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📅"
          title={totalCount === 0 ? 'No sessions logged yet' : 'No sessions match your filters'}
          description={totalCount === 0 ? 'Log the first session to start tracking class history.' : 'Try adjusting the search or filters above.'}
          action={totalCount === 0 ? { label: '+ New Session', onClick: onNewSession } : undefined}
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Batch</th>
                <th>Subject</th>
                <th>Chapter</th>
                <th>Hrs</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const bType = getBatchType(s.batchId ?? '', batches)
                return (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>
                      {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                    </td>
                    <td>
                      {bType && <span className={`badge ${BATCH_TYPE_BADGE[bType] ?? 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>{bType}</span>}
                    </td>
                    <td>{s.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{s.chapter}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.durationHours}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                        {canEdit && s.status !== 'CANCELLED' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(s)} title="Edit session">✎</button>
                        )}
                        {/* Mark Complete only makes sense for legacy SCHEDULED sessions */}
                        {s.status === 'SCHEDULED' && (
                          <button className="btn btn-success btn-sm" onClick={() => onMarkComplete(s._id)} disabled={cancelling === s._id} title="Mark Completed">✓</button>
                        )}
                        {/* Cancel is available for any non-cancelled session */}
                        {(s.status === 'SCHEDULED' || s.status === 'COMPLETED' || s.status === 'NOT_COMPLETED') && (
                          <>
                            <select className="input" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: 105 }}
                              value={cancelInitiator[s._id] ?? ''} onChange={(e) => onCancelInitiatorChange(s._id, e.target.value)}>
                              <option value="">initiator</option>
                              <option value="FACULTY">Faculty</option>
                              <option value="STUDENT">Student</option>
                              <option value="MANAGEMENT">Management</option>
                            </select>
                            <button className="btn btn-danger btn-sm" disabled={cancelling === s._id} onClick={() => onCancel(s._id)} title="Cancel session">
                              {cancelling === s._id ? '…' : '✕'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
