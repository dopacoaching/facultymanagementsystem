import { EmptyState } from '@/components/ui/Skeleton'
import { formatDuration, ISession, STATUS_BADGE } from './types'

interface IGSessionsTableProps {
  filtered: ISession[]
  totalCount: number
  canEdit: boolean
  cancelling: string
  cancelInitiator: Record<string, string>
  onCancelInitiatorChange: (id: string, value: string) => void
  onEdit: (s: ISession) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
  onNewSession: () => void
}

export function IGSessionsTable({
  filtered, totalCount, canEdit, cancelling, cancelInitiator,
  onCancelInitiatorChange, onEdit, onMarkComplete, onCancel, onNewSession,
}: IGSessionsTableProps) {
  return (
    <div className="card">
      {filtered.length === 0 ? (
        <EmptyState
          icon="🏫"
          title={totalCount === 0 ? 'No IG sessions yet' : 'No sessions match your filters'}
          description={totalCount === 0 ? 'Click "+ New Session" above to log the first IG class.' : 'Try adjusting the search term or status filter.'}
          action={totalCount === 0 ? { label: '+ New Session', onClick: onNewSession } : undefined}
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Subject</th>
                <th>Chapter</th>
                <th>Duration</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>
                    {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                  </td>
                  <td>{s.subject}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{s.chapter}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDuration(s.durationHours)}</td>
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
                      {s.status === 'SCHEDULED' && (
                        <button className="btn btn-success btn-sm" onClick={() => onMarkComplete(s._id)}
                          disabled={cancelling === s._id} title="Mark Completed">✓</button>
                      )}
                      {(s.status === 'SCHEDULED' || s.status === 'NOT_COMPLETED') && (
                        <>
                          <select className="input" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: 105 }}
                            value={cancelInitiator[s._id] ?? ''}
                            onChange={(e) => onCancelInitiatorChange(s._id, e.target.value)}>
                            <option value="">initiator</option>
                            <option value="FACULTY">Faculty</option>
                            <option value="STUDENT">Student</option>
                            <option value="MANAGEMENT">Management</option>
                          </select>
                          <button className="btn btn-danger btn-sm" disabled={cancelling === s._id}
                            onClick={() => onCancel(s._id)} title="Cancel Session">
                            {cancelling === s._id ? '…' : '✕'}
                          </button>
                        </>
                      )}
                    </div>
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
