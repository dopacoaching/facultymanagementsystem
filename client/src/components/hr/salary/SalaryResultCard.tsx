import type { Faculty, SalaryResult } from '@/types'
import { MONTHS, statusBadge } from './types'
import { PayrollAlerts } from './PayrollAlerts'
import { CarryForwardGrid } from './CarryForwardGrid'
import { PayBreakdownTable } from './PayBreakdownTable'
import { SalarySummaryStats } from './SalarySummaryStats'
import { PayableDaysEntry } from './PayableDaysEntry'
import { Icon } from '@/components/ui/Icon'
import s from './Salary.module.css'

interface SalaryResultCardProps {
  result: SalaryResult
  selectedFaculty?: Faculty
  month: number
  year: number
  /** Human label for the pay period. Falls back to "{Month} {year}" when omitted. */
  periodLabel?: string
  approved: boolean
  approving: boolean
  canApprove: boolean
  onApprove: () => void
  onPrint: () => void
  savingPayableDays?: boolean
  onSavePayableDays?: (payableDays: number) => void
}

function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0)
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
}

export function SalaryResultCard({
  result, selectedFaculty, month, year, periodLabel, approved, approving, canApprove, onApprove, onPrint,
  savingPayableDays, onSavePayableDays,
}: SalaryResultCardProps) {
  const period = periodLabel ?? `${MONTHS[month - 1]} ${year}`
  const payable = result.status === 'OK' || result.status === 'HR_REVIEW'
  return (
    <div className={`card ${s.result}`} aria-live="polite">
      <div className={s.resultHead}>
        <div className={s.who}>
          <span className="avatar" aria-hidden="true">{initials(selectedFaculty?.name)}</span>
          <div style={{ minWidth: 0 }}>
            <h2>{selectedFaculty?.name}</h2>
            <div className={s.whoSub}>{period} · {selectedFaculty?.subject}</div>
          </div>
        </div>
        <span className={`badge badge-dot ${statusBadge(result.status)} ${s.statusBadge}`}>
          {result.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className={s.resultBody}>
        {(result.status === 'BLOCKED' || result.status === 'PENDING_CONFIG') && result.reason && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon" aria-hidden="true">×</span>
            <div>
              <strong>Payroll Blocked</strong>
              <div className="mt-1">{result.reason}</div>
            </div>
          </div>
        )}

        {result.needsPayableDays && onSavePayableDays && (
          <PayableDaysEntry saving={!!savingPayableDays} onSave={onSavePayableDays} />
        )}

        {result.alerts && <PayrollAlerts alerts={result.alerts} />}

        {result.carryForward && <CarryForwardGrid carryForward={result.carryForward} />}

        {/* TDS/Net Payable are shown in the totals ledger below, not duplicated here */}
        {result.breakdown && (
          <PayBreakdownTable
            breakdown={result.breakdown.filter((row) => row.label !== 'TDS (10%)' && row.label !== 'Net Payable (after TDS)')}
          />
        )}

        {payable && (
          <>
            <SalarySummaryStats result={result} />

            <div className={`${s.ledger} ${result.status === 'HR_REVIEW' ? s.ledgerReview : ''}`}>
              {result.status === 'HR_REVIEW' && (
                <div className={s.ledgerNote}>
                  <Icon name="alert" size={15} /> Pending HR review — approve with caution
                </div>
              )}
              <div className={s.ledgerRow}>
                <span className={s.ledgerLabel}>Total (Gross)</span>
                <span className={s.ledgerFig}>₹{result.finalPayable?.toLocaleString('en-IN')}</span>
              </div>
              <div className={s.ledgerRow}>
                <span className={s.ledgerLabel}>− TDS (10%)</span>
                <span className={`${s.ledgerFig} ${s.deduction}`}>−₹{result.tds?.toLocaleString('en-IN')}</span>
              </div>
              <div className={`${s.ledgerRow} ${s.ledgerNet}`}>
                <span className={s.ledgerLabel}>Net Payable</span>
                <div>
                  <div className={s.netFig}>₹{result.netPayable?.toLocaleString('en-IN')}</div>
                  <div className={s.netPeriod}>{period}</div>
                </div>
              </div>
            </div>

            <div className={s.approveBar}>
              {approved ? (
                <div className={`alert alert-success ${s.approvedNote}`} role="status">
                  <span className="alert-icon" aria-hidden="true"><Icon name="check" size={14} /></span>
                  Salary approved and recorded for {period}.
                </div>
              ) : (
                <button
                  type="button"
                  className={`btn btn-success btn-lg ${s.approveBtn}`}
                  onClick={onApprove}
                  disabled={approving || !canApprove}
                >
                  {approving ? (
                    <><span className="spinner" /> Approving…</>
                  ) : <><Icon name="shield" size={18} /> Approve &amp; Record Salary</>}
                </button>
              )}
              {selectedFaculty && (
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={onPrint}
                  title="Open printable salary slip in new window"
                >
                  <Icon name="report" size={16} /> Print Slip
                </button>
              )}
              {!approved && (
                <p className={s.approveHint}>Approving records this payout for {period}.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
