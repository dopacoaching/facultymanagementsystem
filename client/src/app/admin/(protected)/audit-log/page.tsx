'use client'
import { useEffect, useState, useCallback, Fragment } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import type { AuditEventType, AuditCategory } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  _id: string
  referenceNumber: string
  category: AuditCategory
  eventType: AuditEventType
  actorUserId: string
  actorRole: string
  actorUsername?: string
  targetType?: string
  targetId?: string
  targetName?: string
  description: string
  reason?: string       // legacy field from old documents
  metadata?: Record<string, unknown>
  amount?: number
  cancellationInitiator?: string
  timestamp: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'ALL',       label: 'All Categories' },
  { value: 'HR',        label: 'HR & Salary' },
  { value: 'ACADEMICS', label: 'Academics' },
  { value: 'IG',        label: 'Integrated School' },
  { value: 'ADMIN',     label: 'Admin' },
  { value: 'AUTH',      label: 'Auth' },
]

const CATEGORY_BADGE: Record<string, string> = {
  HR:        'badge-yellow',
  ACADEMICS: 'badge-blue',
  IG:        'badge-purple',
  ADMIN:     'badge-red',
  AUTH:      'badge-gray',
}

const EVENT_ICON: Partial<Record<AuditEventType, string>> = {
  FACULTY_CREATED:        '👤',
  FACULTY_UPDATED:        '✏️',
  PAY_CONFIG_UPDATED:     '💰',
  SALARY_APPROVED:        '✅',
  PENALTY_APPLIED:        '⚠️',
  OVERTIME_ADDED:         '⏰',
  BALANCE_CARRY_FORWARD:  '↩️',
  SESSION_LOGGED:         '📝',
  SESSION_UPDATED:        '✏️',
  SESSION_STATUS_CHANGED: '🔄',
  SESSION_CANCELLED:      '❌',
  CHAPTER_UPDATED:        '📚',
  SCHEDULE_CREATED:       '🗓',
  SCHEDULE_UPDATED:       '✏️',
  SCHEDULE_PUBLISHED:     '📢',
  SCHEDULE_REVISED:       '🔄',
  SCHEDULE_DELETED:       '🗑',
  IG_SESSION_LOGGED:      '🏫',
  IG_SESSION_STATUS_CHANGED: '🔄',
  IG_SESSION_CANCELLED:   '❌',
  IG_CHAPTER_UPDATED:     '📖',
  IG_TIMETABLE_ASSIGNED:  '📅',
  IG_TIMETABLE_UPDATED:   '✏️',
  IG_TIMETABLE_DELETED:   '🗑',
  SPECIAL_DAY_ADDED:      '🏖',
  SPECIAL_DAY_DELETED:    '🗑',
  USER_ACCOUNT_CREATED:   '🔐',
  USER_ACCOUNT_UPDATED:   '✏️',
  USER_LOGGED_IN:         '🔑',
  USER_LOGGED_OUT:        '🚪',
  PASSWORD_CHANGED:       '🔒',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN:                'Admin',
  HR_MANAGER:           'HR Manager',
  ACADEMICS_MANAGER:    'Academics Mgr',
  IG_ACADEMICS_MANAGER: 'IG Academics Mgr',
  COORDINATOR:          'Class Teacher',
  IG_COORDINATOR:       'IG Class Teacher',
  FACULTY:              'Faculty',
  SYSTEM:               'System',
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

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
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Audit Log</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {total.toLocaleString('en-IN')} event{total !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          {loading ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} />Loading…</> : '↻ Refresh'}
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category */}
          <select className="input" style={{ minWidth: 160 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {/* Actor role */}
          <select className="input" style={{ minWidth: 160 }} value={actorRole} onChange={(e) => setActorRole(e.target.value)}>
            <option value="ALL">All Roles</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {/* Date range */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="date" className="input" style={{ width: 150 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>to</span>
            <input type="date" className="input" style={{ width: 150 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          {/* Clear */}
          {(category !== 'ALL' || actorRole !== 'ALL' || search || dateFrom || dateTo) && (
            <button className="btn btn-ghost btn-sm" onClick={() => {
              setCategory('ALL'); setActorRole('ALL'); setSearch(''); setDateFrom(''); setDateTo('')
            }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="card">
        {loading && logs.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-muted)', padding: '2rem' }}>
            <span className="spinner" /> Loading events…
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No audit events found</h3>
            <p>Try adjusting the filters, or actions will appear here as they happen</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Ref #</th>
                  <th style={{ width: 110 }}>Category</th>
                  <th>Description</th>
                  <th style={{ width: 140 }}>Target</th>
                  <th style={{ width: 140 }}>Actor</th>
                  <th style={{ width: 145 }}>Time</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isOpen = expanded === log._id
                  const icon = EVENT_ICON[log.eventType] ?? '📌'
                  return (
                    <Fragment key={log._id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : log._id)}
                        style={{ cursor: 'pointer', background: isOpen ? 'var(--color-surface-2)' : undefined }}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                          {log.referenceNumber}
                        </td>
                        <td>
                          <span className={`badge ${CATEGORY_BADGE[log.category] ?? 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                            {log.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{log.description || log.reason || '—'}</div>
                              {(log.amount ?? 0) > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '0.125rem' }}>
                                  ₹{(log.amount ?? 0).toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                          {log.targetName ? (
                            <div>
                              <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{log.targetName}</div>
                              {log.targetType && <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{log.targetType}</div>}
                            </div>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.8125rem' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {log.actorUsername ?? (log.actorUserId ? log.actorUserId.slice(-8) : '—')}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                              {log.actorRole ? (ROLE_LABEL[log.actorRole] ?? log.actorRole) : '—'}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                          {fmtDate(log.timestamp)}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.7rem' }}>
                          {isOpen ? '▲' : '▼'}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isOpen && (
                        <tr key={`${log._id}-detail`}>
                          <td colSpan={7} style={{ padding: '0 1rem 0.875rem 2.5rem', background: 'var(--color-surface-2)' }}>
                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '0.75rem 0' }}>
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Event</div>
                                <code style={{ fontSize: '0.75rem', background: 'var(--color-surface)', padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                                  {log.eventType}
                                </code>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Actor ID</div>
                                <code style={{ fontSize: '0.75rem' }}>{log.actorUserId ?? '—'}</code>
                              </div>
                              {log.targetId && (
                                <div>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Target ID</div>
                                  <code style={{ fontSize: '0.75rem' }}>{log.targetId}</code>
                                </div>
                              )}
                              {log.cancellationInitiator && (
                                <div>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Cancelled By</div>
                                  <span className="badge badge-yellow">{log.cancellationInitiator}</span>
                                </div>
                              )}
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Metadata</div>
                                  <pre style={{ fontSize: '0.72rem', background: 'var(--color-surface)', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border)', margin: 0, maxWidth: 480, overflowX: 'auto' }}>
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'center', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)', padding: '0 0.75rem' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        )}
      </div>
    </div>
  )
}
