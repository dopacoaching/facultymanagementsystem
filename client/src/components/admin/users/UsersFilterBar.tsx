import { ALL_ROLES, getRoleLabel } from './types'

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
    <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>

        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none', fontSize: '0.9rem' }}>🔍</span>
          <input
            className="input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search username…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Role */}
        <select className="input" style={{ minWidth: 180 }} value={role} onChange={(e) => onRoleChange(e.target.value)}>
          <option value="ALL">All Roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{getRoleLabel(r)}</option>
          ))}
        </select>

        {/* Clear */}
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
