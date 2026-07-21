import type { AppUser } from '@/services/user.service'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { ROLE_BADGE, getRoleLabel } from './types'

interface UsersTableProps {
  loading: boolean
  users: AppUser[]
  selfId: string | undefined
  toggling: string
  onEdit: (u: AppUser) => void
  onToggleActive: (u: AppUser) => void
  onNewUser: () => void
}

export function UsersTable({ loading, users, selfId, toggling, onEdit, onToggleActive, onNewUser }: UsersTableProps) {
  if (loading) return <SkeletonTable rows={5} cols={5} />

  if (users.length === 0) {
    return (
      <EmptyState
        icon="🔐"
        title="No users yet"
        description="Create the first user account to give staff access to the system."
        action={{ label: '+ New User', onClick: onNewUser }}
      />
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Faculty / Batch</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
              <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                @{u.username}
                {u._id === selfId && (
                  <span className="badge badge-blue" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>you</span>
                )}
              </td>
              <td>
                <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}>
                  {getRoleLabel(u.role)}
                </span>
              </td>
              <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {u.facultyId && typeof u.facultyId === 'object'
                  ? <span title="Linked faculty">👤 {u.facultyId.name}</span>
                  : null}
                {u.batchId && typeof u.batchId === 'object'
                  ? <span title="Assigned batch" style={{ marginLeft: u.facultyId ? '0.5rem' : 0 }}>🗂 {u.batchId.name}</span>
                  : null}
                {!u.facultyId && !u.batchId ? '—' : null}
              </td>
              <td>
                <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'nowrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(u)} title="Edit user">✎</button>
                  {u._id !== selfId && (
                    <button
                      className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => onToggleActive(u)}
                      disabled={toggling === u._id}
                      title={u.isActive ? 'Deactivate' : 'Reactivate'}
                    >
                      {toggling === u._id ? '…' : u.isActive ? '⏸' : '▶'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
