import type { DashboardData } from '@/services/salary.service'
import { MONTHS } from './types'

interface CancellationLogCardProps {
  cancellationLog: DashboardData['cancellationLog']
  month: number
  year: number
}

export function CancellationLogCard({ cancellationLog, month, year }: CancellationLogCardProps) {
  return (
    <div className="card" style={{ minWidth: 0 }}>
      <div className="card-header">
        <h2>Cancellation Log</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{MONTHS[month - 1]} {year}</span>
      </div>
      {cancellationLog.length === 0 ? (
        <div className="empty-state" style={{ padding: '1.5rem' }}>
          <div className="empty-state-icon" style={{ fontSize: '1.25rem' }}>✅</div>
          <p>No cancellations this month</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {cancellationLog.map((c, i) => (
            <div
              key={i}
              style={{
                padding: '0.625rem 0.75rem',
                borderRadius: '0.5rem',
                background: 'var(--color-surface-2)',
                borderLeft: `3px solid ${c.cancellationInitiator === 'FACULTY' ? 'var(--color-warning)' : 'var(--color-danger)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{c.facultyName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.1rem' }}>
                    {c.subject} · {c.chapter}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(c.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                  <div style={{
                    fontSize: '0.68rem', fontWeight: 700, marginTop: '0.15rem',
                    color: c.cancellationInitiator === 'FACULTY' ? 'var(--color-warning)' : 'var(--color-danger)',
                  }}>
                    {c.cancellationInitiator}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
