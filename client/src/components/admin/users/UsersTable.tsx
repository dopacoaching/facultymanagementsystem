import type { AppUser } from '@/services/user.service'
import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { Icon } from '@/components/ui/Icon'
import { ROLE_BADGE, getRoleLabel } from './types'
import s from './Users.module.css'

interface UsersTableProps {
  loading: boolean
  users: AppUser[]
  selfId: string | undefined
  toggling: string
  onEdit: (u: AppUser) => void
  onToggleActive: (u: AppUser) => void
  onNewUser: () => void
  hasHiddenUsers?: boolean
}

export function UsersTable({ loading, users, selfId, toggling, onEdit, onToggleActive, onNewUser, hasHiddenUsers }: UsersTableProps) {
  if (loading) return <SkeletonTable rows={5} cols={5} />

  if (users.length === 0) {
    return hasHiddenUsers ? (
      <EmptyState
        iconName="search"
        title="No matching users"
        description="No users match the current search or role filter."
      />
    ) : (
      <EmptyState
        iconName="users"
        title="No users yet"
        description="Create the first user account to give staff access to the system."
        action={{ label: '+ New User', onClick: onNewUser }}
      />
    )
  }

  return (
    <div className="table-wrapper table-stack" aria-live="polite">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Faculty / Batch</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className={u.isActive ? undefined : s.inactive}>
              <td data-label="Username">
                <div className={s.userCell}>
                  <span className="avatar" aria-hidden="true">{u.username.charAt(0)}</span>
                  <span className={s.userName}>
                    @{u.username}
                    {u._id === selfId && <span className={`badge badge-blue ${s.youTag}`}>you</span>}
                  </span>
                </div>
              </td>
              <td data-label="Role">
                <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}>
                  {getRoleLabel(u.role)}
                </span>
              </td>
              <td data-label="Faculty / Batch">
                <div className={s.linkCell}>
                  {u.facultyId && typeof u.facultyId === 'object'
                    ? <span className={s.linkItem} title="Linked faculty"><Icon name="user" size={14} />{u.facultyId.name}</span>
                    : null}
                  {u.batchId && typeof u.batchId === 'object'
                    ? <span className={s.linkItem} title="Assigned batch"><Icon name="layers" size={14} />{u.batchId.name}</span>
                    : null}
                  {!u.facultyId && !u.batchId ? <span className={s.dim}>—</span> : null}
                </div>
              </td>
              <td data-label="Status">
                <span className={`badge badge-dot ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td data-label="Actions">
                <div className={s.actions}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => onEdit(u)} aria-label={`Edit @${u.username}`}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                  {u._id !== selfId && (
                    <button
                      type="button"
                      className={`btn btn-sm ${u.isActive ? 'btn-danger-ghost' : 'btn-success'}`}
                      onClick={() => onToggleActive(u)}
                      disabled={toggling === u._id}
                      aria-label={`${u.isActive ? 'Deactivate' : 'Reactivate'} @${u.username}`}
                    >
                      {toggling === u._id ? '…' : u.isActive ? 'Deactivate' : 'Reactivate'}
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
