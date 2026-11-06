'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { Icon } from '@/components/ui/Icon'
import {
  AuditLogEntry, AuditLogFilterBar, AuditLogTable, AuditLogPagination,
} from '@/components/admin/audit-log'

export default function AdminAuditLogPage() {
  const { accessToken } = useAppSelector((s) => s.auth)

  const [logs,    setLogs]    = useState<AuditLogEntry[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [page,    setPage]    = useState(1)
  const limit = 50

  // Filters
  const [category,   setCategory]   = useState('ALL')
  const [actorRole,  setActorRole]  = useState('ALL')
  const [search,     setSearch]     = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  // Expanded row for metadata
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!accessToken) return
    setLoading(true)
    const params = new URLSearchParams({
      page:      String(page),
      limit:     String(limit),
      ...(category  !== 'ALL' ? { category }  : {}),
      ...(actorRole !== 'ALL' ? { actorRole } : {}),
      ...(search.trim()       ? { search: search.trim() } : {}),
      ...(dateFrom            ? { from: dateFrom } : {}),
      ...(dateTo              ? { to:   dateTo   } : {}),
    })
    apiFetch<{ logs: AuditLogEntry[]; total: number }>(`/hr/audit-log?${params}`, { token: accessToken })
      .then((r) => { setLogs(r.logs); setTotal(r.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, page, category, actorRole, search, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [category, actorRole, search, dateFrom, dateTo])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Audit Log</h1>
          <p className="page-subtitle">
            <span className="num">{total.toLocaleString('en-IN')}</span> event{total !== 1 ? 's' : ''} recorded · read-only record of system activity
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>
            {loading ? <><span className="spinner" /> Loading…</> : <><Icon name="history" size={16} /> Refresh</>}
          </button>
        </div>
      </div>

      <AuditLogFilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        actorRole={actorRole}
        onActorRoleChange={setActorRole}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClear={() => { setCategory('ALL'); setActorRole('ALL'); setSearch(''); setDateFrom(''); setDateTo('') }}
      />

      <AuditLogTable
        loading={loading}
        logs={logs}
        expanded={expanded}
        onToggleExpand={(id) => setExpanded((prev) => prev === id ? null : id)}
      />

      <AuditLogPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
