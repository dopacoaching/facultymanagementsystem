import { Icon } from '@/components/ui/Icon'
import s from './AuditLog.module.css'

interface AuditLogPaginationProps {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}

export function AuditLogPagination({ page, totalPages, onPageChange }: AuditLogPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav className={s.pager} aria-label="Audit log pages">
      <span className={s.pagerInfo} aria-live="polite">
        Page <span className="num">{page}</span> of <span className="num">{totalPages}</span>
      </span>
      <div className={s.pagerBtns}>
        <button type="button" aria-label="First page" className="btn btn-outline btn-sm btn-icon" disabled={page === 1} onClick={() => onPageChange(1)}>
          <Icon name="chevronLeft" size={14} /><Icon name="chevronLeft" size={14} style={{ marginLeft: -9 }} />
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <Icon name="chevronLeft" size={14} /> Prev
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          Next <Icon name="chevronRight" size={14} />
        </button>
        <button type="button" aria-label="Last page" className="btn btn-outline btn-sm btn-icon" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>
          <Icon name="chevronRight" size={14} /><Icon name="chevronRight" size={14} style={{ marginLeft: -9 }} />
        </button>
      </div>
    </nav>
  )
}
