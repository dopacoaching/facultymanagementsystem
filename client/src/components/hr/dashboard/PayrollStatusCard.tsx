import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import type { DashboardData } from '@/services/salary.service'
import { payrollBadge } from './types'

interface PayrollStatusCardProps {
  loading: boolean
  hasData: boolean
  payrollStatus: DashboardData['payrollStatus']
}

export function PayrollStatusCard({ loading, hasData, payrollStatus }: PayrollStatusCardProps) {
  return (
    <div className="card" style={{ minWidth: 0 }}>
      <div className="card-header">
        <h2>Payroll Status</h2>
        <Link
          href="/hr/salary"
          style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
        >
          Open Calculator →
        </Link>
      </div>
      {loading && !hasData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1,2,3,4].map((i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.375rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <Skeleton height="0.875rem" width={120} />
                <Skeleton height="0.7rem" width={70} />
              </div>
              <Skeleton height="1.25rem" width={60} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {payrollStatus.map((item) => (
            <div
              key={item.facultyId.toString()}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0.375rem',
                borderRadius: '0.375rem',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{item.subject}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {item.status === 'APPROVED' && item.finalPayable != null && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{item.finalPayable.toLocaleString('en-IN')}
                  </span>
                )}
                <span className={`badge ${payrollBadge(item.status)}`} style={{ fontSize: '0.7rem' }}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
          {payrollStatus.length === 0 && (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-state-icon" style={{ fontSize: '1.25rem' }}>📊</div>
              <p>No faculty data</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
