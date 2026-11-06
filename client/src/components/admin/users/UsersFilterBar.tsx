import { Icon } from '@/components/ui/Icon'
import { ALL_ROLES, getRoleLabel } from './types'
import s from './Users.module.css'

interface UsersFilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  role: string
  onRoleChange: (v: string) => void
  onClear: () => void
}

export function UsersFilterBar({ search, onSearchChange, role, onRoleChange, onClear }: UsersFilterBarProps) {
  const hasFilters = search !== '' || role !== 'ALL'

  return (
    <div className="toolbar" role="search">
      <div className={`form-group ${s.search}`}>
        <label className="label" htmlFor="users-search">Search</label>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={16} className={s.searchIcon} />
          <input
            id="users-search"
            type="search"
            className={`input ${s.searchInput}`}
            placeholder="Search username…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className={`form-group ${s.roleSelect}`}>
        <label className="label" htmlFor="users-role">Role</label>
        <select id="users-role" className="input" value={role} onChange={(e) => onRoleChange(e.target.value)}>
          <option value="ALL">All Roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{getRoleLabel(r)}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          <Icon name="x" size={14} /> Clear filters
        </button>
      )}
    </div>
  )
}
