import type { Session } from '@/types'
import type { Batch } from '@/services/faculty.service'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { Icon } from '@/components/ui/Icon'
import { BATCH_TYPE_BADGE, STATUS_BADGE } from './types'
import s from './Sessions.module.css'

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
  if (loading) return <div className="card card-flush"><SkeletonTable rows={8} cols={8} /></div>

  if (filtered.length === 0) {
    return (
      <div className="card">
        <EmptyState
          title={totalCount === 0 ? 'No sessions logged yet' : 'No sessions match your filters'}
          description={totalCount === 0 ? 'Log the first session to start tracking class history.' : 'Try adjusting the search or filters above.'}
          action={totalCount === 0 ? { label: '+ New Session', onClick: onNewSession } : undefined}
        />
      </div>
    )
  }

  return (
    <div className="table-wrapper table-stack">
      <table>
        <thead>
          <tr>
            <th>Faculty</th>
            <th>Batch</th>
            <th>Subject</th>
            <th>Chapter</th>
            <th className="num">Hrs</th>
            <th>Date</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const bType = getBatchType(row.batchId ?? '', batches)
            return (
              <tr key={row._id}>
                <td data-label="Faculty" className={s.faculty}>
                  {(typeof row.facultyId === 'object' ? row.facultyId?.name : row.facultyId) ?? '—'}
                </td>
                <td data-label="Batch">
                  {bType ? <span className={`badge badge-sentence ${BATCH_TYPE_BADGE[bType] ?? 'badge-gray'}`}>{bType}</span> : <span className="text-muted">—</span>}
                </td>
                <td data-label="Subject" className={s.subject}>{row.subject}</td>
                <td data-label="Chapter" className={s.chapter}>{row.chapter}</td>
                <td data-label="Hrs" className="num">{row.durationHours}</td>
                <td data-label="Date" className={`mono ${s.date}`}>
                  {new Date(row.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td data-label="Status">
                  <span className={`badge badge-dot ${STATUS_BADGE[row.status] ?? 'badge-gray'}`}>
                    {row.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td data-label="Actions">
                  <div className={s.actions}>
                    {canEdit && row.status !== 'CANCELLED' && (
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(row)} title="Edit session" aria-label="Edit session">
                        <Icon name="edit" size={15} />
                      </button>
                    )}
                    {/* Mark Complete only makes sense for legacy SCHEDULED sessions */}
                    {row.status === 'SCHEDULED' && (
                      <button type="button" className="btn btn-success btn-sm btn-icon" onClick={() => onMarkComplete(row._id)} disabled={cancelling === row._id} title="Mark completed" aria-label="Mark completed">
                        <Icon name="check" size={15} />
                      </button>
                    )}
                    {/* Cancel is available for any non-cancelled session */}
                    {(row.status === 'SCHEDULED' || row.status === 'COMPLETED' || row.status === 'NOT_COMPLETED') && (
                      <div className={s.cancelGroup}>
                        <select className={`input ${s.initiator}`} aria-label="Cancellation initiator"
                          value={cancelInitiator[row._id] ?? ''} onChange={(e) => onCancelInitiatorChange(row._id, e.target.value)}>
                          <option value="">initiator</option>
                          <option value="FACULTY">Faculty</option>
                          <option value="STUDENT">Student</option>
                          <option value="MANAGEMENT">Management</option>
                        </select>
                        <button type="button" className="btn btn-danger-ghost btn-sm btn-icon" disabled={cancelling === row._id} onClick={() => onCancel(row._id)} title="Cancel session" aria-label="Cancel session">
                          {cancelling === row._id ? <span className="spinner" /> : <Icon name="x" size={15} />}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
