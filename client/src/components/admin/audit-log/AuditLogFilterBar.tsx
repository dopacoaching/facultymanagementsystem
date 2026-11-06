import { Icon } from '@/components/ui/Icon'
import { CATEGORIES, ROLE_LABEL } from './types'
import s from './AuditLog.module.css'

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
    <div className="toolbar" role="search">
      <div className={`form-group ${s.search}`}>
        <label className="label" htmlFor="audit-search">Search</label>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={16} className={s.searchIcon} />
          <input
            id="audit-search"
            type="search"
            className={`input ${s.searchInput}`}
            placeholder="Search description, target, actor…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className={`form-group ${s.select}`}>
        <label className="label" htmlFor="audit-category">Category</label>
        <select id="audit-category" className="input" value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className={`form-group ${s.select}`}>
        <label className="label" htmlFor="audit-actor-role">Actor role</label>
        <select id="audit-actor-role" className="input" value={actorRole} onChange={(e) => onActorRoleChange(e.target.value)}>
          <option value="ALL">All Roles</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className={s.dates}>
        <div className="form-group">
          <label className="label" htmlFor="audit-from">From</label>
          <input id="audit-from" type="date" className="input" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </div>
        <span className={s.dateSep} aria-hidden="true">to</span>
        <div className="form-group">
          <label className="label" htmlFor="audit-to">To</label>
          <input id="audit-to" type="date" className="input" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>
      </div>

      {hasFilters && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          <Icon name="x" size={14} /> Clear filters
        </button>
      )}
    </div>
  )
}
