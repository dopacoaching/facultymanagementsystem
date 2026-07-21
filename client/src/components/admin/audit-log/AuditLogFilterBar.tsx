import { CATEGORIES, ROLE_LABEL } from './types'

interface AuditLogFilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  category: string
  onCategoryChange: (v: string) => void
  actorRole: string
  onActorRoleChange: (v: string) => void
  dateFrom: string
  onDateFromChange: (v: string) => void
  dateTo: string
  onDateToChange: (v: string) => void
  onClear: () => void
}

export function AuditLogFilterBar({
  search, onSearchChange, category, onCategoryChange, actorRole, onActorRoleChange,
  dateFrom, onDateFromChange, dateTo, onDateToChange, onClear,
}: AuditLogFilterBarProps) {
  const hasFilters = category !== 'ALL' || actorRole !== 'ALL' || search || dateFrom || dateTo

  return (
    <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>

        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none', fontSize: '0.9rem' }}>🔍</span>
          <input
            className="input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search description, target, actor…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Category */}
        <select className="input" style={{ minWidth: 160 }} value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {/* Actor role */}
        <select className="input" style={{ minWidth: 160 }} value={actorRole} onChange={(e) => onActorRoleChange(e.target.value)}>
          <option value="ALL">All Roles</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {/* Date range */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="date" className="input" style={{ width: 150 }} value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>to</span>
          <input type="date" className="input" style={{ width: 150 }} value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>

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
