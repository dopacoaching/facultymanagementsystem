import type { Faculty, SalaryResult } from '@/types'
import { MONTHS, statusBadge } from './types'
import { PayrollAlerts } from './PayrollAlerts'
import { CarryForwardGrid } from './CarryForwardGrid'
import { PayBreakdownTable } from './PayBreakdownTable'
import { SalarySummaryStats } from './SalarySummaryStats'

interface SalaryResultCardProps {
  result: SalaryResult
  selectedFaculty?: Faculty
  month: number
  year: number
  approved: boolean
  approving: boolean
  canApprove: boolean
  onApprove: () => void
  onPrint: () => void
}

export function SalaryResultCard({
  result, selectedFaculty, month, year, approved, approving, canApprove, onApprove, onPrint,
}: SalaryResultCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 style={{ margin: 0 }}>{selectedFaculty?.name}</h2>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            {MONTHS[month - 1]} {year} · {selectedFaculty?.subject}
          </div>
        </div>
        <span className={`badge ${statusBadge(result.status)}`} style={{ fontSize: '0.8rem' }}>
          {result.status.replace(/_/g, ' ')}
        </span>
      </div>

      {(result.status === 'BLOCKED' || result.status === 'PENDING_CONFIG') && result.reason && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <span className="alert-icon">🚫</span>
          <div>
            <strong>Payroll Blocked</strong>
            <div style={{ marginTop: '0.2rem', fontWeight: 400 }}>{result.reason}</div>
          </div>
        </div>
      )}

      {result.alerts && <PayrollAlerts alerts={result.alerts} />}

      {result.carryForward && <CarryForwardGrid carryForward={result.carryForward} />}

      {result.breakdown && <PayBreakdownTable breakdown={result.breakdown} />}

      {(result.status === 'OK' || result.status === 'HR_REVIEW') && (
        <>
          <SalarySummaryStats result={result} />

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '0.75rem',
            padding: '1.25rem 1.5rem',
            background: result.status === 'HR_REVIEW'
              ? 'linear-gradient(135deg, #92400e, #b45309)'
              : 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
            color: '#fff',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.25rem',
            boxShadow: result.status === 'HR_REVIEW'
              ? '0 4px 16px rgba(180,83,9,.3)'
              : '0 4px 16px rgba(79,70,229,.3)',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', opacity: 0.9 }}>Final Payable</div>
              {result.status === 'HR_REVIEW' && (
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.2rem' }}>
                  ⚠️ Pending HR review — approve with caution
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
                ₹{result.finalPayable?.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.2rem' }}>
                {MONTHS[month - 1]} {year}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {approved ? (
              <div className="alert alert-success" style={{ flex: 1, margin: 0 }}>
                <span className="alert-icon">✅</span>
                Salary approved and recorded for {MONTHS[month - 1]} {year}.
              </div>
            ) : (
              <button
                className="btn btn-success"
                onClick={onApprove}
                disabled={approving || !canApprove}
                style={{ flex: 1 }}
              >
                {approving ? (
                  <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Approving…</>
                ) : '✓ Approve & Record Salary'}
              </button>
            )}
            {selectedFaculty && (
              <button
                className="btn btn-ghost"
                onClick={onPrint}
                title="Open printable salary slip in new window"
              >
                🖨 Print Slip
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
