import type { Faculty, SalaryResult } from '@/types'
import { MONTHS, statusBadge } from './types'
import { PayrollAlerts } from './PayrollAlerts'
import { CarryForwardGrid } from './CarryForwardGrid'
import { PayBreakdownTable } from './PayBreakdownTable'
import { SalarySummaryStats } from './SalarySummaryStats'
import { PayableDaysEntry } from './PayableDaysEntry'

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
  savingPayableDays?: boolean
  onSavePayableDays?: (payableDays: number) => void
}

export function SalaryResultCard({
  result, selectedFaculty, month, year, approved, approving, canApprove, onApprove, onPrint,
  savingPayableDays, onSavePayableDays,
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

      {result.needsPayableDays && onSavePayableDays && (
        <PayableDaysEntry saving={!!savingPayableDays} onSave={onSavePayableDays} />
      )}

      {result.alerts && <PayrollAlerts alerts={result.alerts} />}

      {result.carryForward && <CarryForwardGrid carryForward={result.carryForward} />}

      {/* TDS/Net Payable are shown in the highlighted total box below, not duplicated here */}
      {result.breakdown && (
        <PayBreakdownTable
          breakdown={result.breakdown.filter((row) => row.label !== 'TDS (10%)' && row.label !== 'Net Payable (after TDS)')}
        />
      )}

      {(result.status === 'OK' || result.status === 'HR_REVIEW') && (
        <>
          <SalarySummaryStats result={result} />

          <div style={{
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
            {result.status === 'HR_REVIEW' && (
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                ⚠️ Pending HR review — approve with caution
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: 0.9 }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Total (Gross)</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{result.finalPayable?.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: 0.9, marginTop: '0.4rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>− TDS (10%)</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>−₹{result.tds?.toLocaleString('en-IN')}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '0.75rem',
              marginTop: '0.75rem', paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255,255,255,0.3)',
            }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Net Payable</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
                  ₹{result.netPayable?.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.2rem' }}>
                  {MONTHS[month - 1]} {year}
                </div>
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
