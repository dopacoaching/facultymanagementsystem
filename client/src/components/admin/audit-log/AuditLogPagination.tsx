interface AuditLogPaginationProps {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}

export function AuditLogPagination({ page, totalPages, onPageChange }: AuditLogPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'center', alignItems: 'center' }}>
      <button type="button" aria-label="First page" className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => onPageChange(1)}>«</button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>← Prev</button>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)', padding: '0 0.75rem' }}>
        Page {page} of {totalPages}
      </span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next →</button>
      <button type="button" aria-label="Last page" className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>»</button>
    </div>
  )
}
