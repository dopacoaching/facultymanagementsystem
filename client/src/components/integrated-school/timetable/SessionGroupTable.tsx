import { Slot, SESSION_TYPE_BADGE, SESSION_TYPE_LABEL, SLOT_STATUS_BADGE } from './types'

interface SessionGroupTableProps {
  label: string
  slots: Slot[]
  canManage: boolean
  canDelete: boolean
  getBatchName: (bid: Slot['batchId']) => string
  getFacultyName: (fid: Slot['facultyId']) => string
  onMarkStatus: (id: string, status: 'COMPLETED' | 'CANCELLED') => void
  onDelete: (id: string) => void
}

export function SessionGroupTable({
  label, slots, canManage, canDelete, getBatchName, getFacultyName, onMarkStatus, onDelete,
}: SessionGroupTableProps) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: 'var(--color-primary)' }}>{label}</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{slots.length} class{slots.length !== 1 ? 'es' : ''}</span>
      </div>
      {slots.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>No session assigned</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Chapter / Topic</th>
                <th>Faculty</th>
                <th>Planned</th>
                <th>Status</th>
                {canManage && <th style={{ width: 140 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot._id}>
                  <td style={{ fontWeight: 600 }}>
                    {getBatchName(slot.batchId)}
                    {slot.isUnplanned && (
                      <span className="badge badge-yellow" style={{ marginLeft: '0.375rem', fontSize: '0.65rem' }}>unplanned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${SESSION_TYPE_BADGE[slot.sessionType] ?? 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                      {SESSION_TYPE_LABEL[slot.sessionType] ?? slot.sessionType ?? 'Live'}
                    </span>
                  </td>
                  <td>{slot.subject}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {slot.chapter}
                  </td>
                  <td>{getFacultyName(slot.facultyId)}</td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
                    {slot.durationHours ? `${slot.durationHours}h` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${SLOT_STATUS_BADGE[slot.status] ?? 'badge-gray'}`}>
                      {slot.status}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'nowrap' }}>
                        {slot.status === 'PLANNED' && (
                          <>
                            <button className="btn btn-success btn-sm" title="Mark Completed"
                              onClick={() => onMarkStatus(slot._id, 'COMPLETED')}>✓</button>
                            <button className="btn btn-danger btn-sm" title="Cancel"
                              onClick={() => onMarkStatus(slot._id, 'CANCELLED')}>✕</button>
                            {canDelete && (
                              <button className="btn btn-ghost btn-sm" title="Delete"
                                onClick={() => onDelete(slot._id)}>🗑</button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
