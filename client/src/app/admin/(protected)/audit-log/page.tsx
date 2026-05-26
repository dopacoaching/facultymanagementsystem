'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAuditLog } from '@/services/salary.service'
import type { AuditLog } from '@/types'

const EVENT_BADGE: Record<string, string> = {
  SALARY_APPROVED:       'badge-green',
  PENALTY_APPLIED:       'badge-red',
  SESSION_CANCELLED:     'badge-red',
  PAY_CONFIG_UPDATED:    'badge-yellow',
  SALARY_FIELD_CHANGED:  'badge-yellow',
  OVERTIME_ADDED:        'badge-blue',
  BALANCE_CARRY_FORWARD: 'badge-blue',
  FACULTY_CREATED:       'badge-green',
  FACULTY_UPDATED:       'badge-gray',
}

export default function AdminAuditLogPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const limit = 20

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    getAuditLog(accessToken, page, limit)
      .then((r) => { setLogs(r.logs); setTotal(r.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, page])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>Audit Log</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            {total} event{total !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      <div className="card">
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-muted)', padding: '1rem 0' }}>
            <span className="spinner" />
            Loading…
          </div>
        )}

        {!loading && logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No audit events yet</h3>
            <p>Events will appear here as actions are taken</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Event</th>
                  <th>Faculty</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                      {log.referenceNumber}
                    </td>
                    <td>
                      <span className={`badge ${EVENT_BADGE[log.eventType] ?? 'badge-gray'}`}>
                        {log.eventType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.facultyName}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {log.amount ? `₹${log.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{
                      maxWidth: 220,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.8125rem',
                    }}>
                      {log.reason || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'center', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              ← Prev
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)', padding: '0 0.5rem' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
