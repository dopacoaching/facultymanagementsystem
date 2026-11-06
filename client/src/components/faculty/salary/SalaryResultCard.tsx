import type { SalaryResult } from '@/types'
import type { HoursSummaryResponse } from '@/services/salary.service'
import { MONTHS } from './types'
import s from '../Portal.module.css'

interface SalaryResultCardProps {
  result: SalaryResult
  month: number
  year: number
  hoursSummary: HoursSummaryResponse | null
}

export function SalaryResultCard({ result, month, year, hoursSummary }: SalaryResultCardProps) {
  const facts = ([
    ['Hours This Month', result.hoursLogged  != null ? `${result.hoursLogged} hrs` : null],
    ['Total Hours (All Time)', hoursSummary != null ? `${hoursSummary.allTimeTotalHours.toFixed(1)} hrs` : null],
    ['Balance Hours (to reach quota)', result.monthBalance != null ? `${result.monthBalance} hrs` : null],
  ] as [string, string | null][]).filter(([, v]) => v != null)

  return (
    <div className="card" aria-live="polite">
      <div className="card-header">
        <h2>{MONTHS[month - 1]} {year}</h2>
        <span className={`badge badge-dot ${result.status === 'OK' ? 'badge-green' : result.status === 'HR_REVIEW' ? 'badge-yellow' : 'badge-red'}`}>
          {result.status.replace(/_/g, ' ')}
        </span>
      </div>

      {result.status === 'BLOCKED' && result.reason && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon" aria-hidden="true">×</span>
          <div>{result.reason}</div>
        </div>
      )}

      {result.status === 'PENDING_CONFIG' && (
        <div className="alert alert-warning">
          <span className="alert-icon" aria-hidden="true">!</span>
          <div>Your pay contract is being configured by HR. Please check back later.</div>
        </div>
      )}

      {(result.status === 'OK' || result.status === 'HR_REVIEW') && (
        <>
          <div className={s.facts}>
            {facts.map(([label, value]) => (
              <div key={label} className={s.fact}>
                <span className={s.factLabel}>{label}</span>
                <span className={s.factValue}>{value}</span>
              </div>
            ))}
          </div>

          {/* Pay breakdown — itemized payment details, most useful for temporary/hourly faculty.
              TDS/Net Payable rows are shown in the totals ledger below, not duplicated here. */}
          {result.breakdown && result.breakdown.length > 0 && (
            <div className={s.block}>
              <p className="section-label">Payment Details</p>
              <div className="table-wrapper">
                <table className={s.lines}>
                  <tbody>
                    {result.breakdown
                      .filter((row) => row.label !== 'TDS (10%)' && row.label !== 'Net Payable (after TDS)')
                      .map((row, i) => (
                      <tr key={i}>
                        <td className={row.isDeduction ? s.deduction : undefined}>
                          {row.isDeduction ? '− ' : ''}{row.label}
                        </td>
                        <td className={`amt ${row.isDeduction ? s.deduction : ''}`}>
                          {/\bhours?\b|\bhrs\b|\bquota\b/i.test(row.label)
                            ? `${row.amount % 1 === 0 ? row.amount : row.amount.toFixed(1)} hrs`
                            : (Number.isInteger(row.amount) || row.amount > 100
                                ? `₹${row.amount.toLocaleString('en-IN')}`
                                : row.amount.toFixed(1))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={s.ledger}>
            <div className={s.ledgerRow}>
              <span className={s.ledgerLabel}>Total (Gross)</span>
              <span className={s.ledgerFig}>₹{result.finalPayable?.toLocaleString('en-IN')}</span>
            </div>
            <div className={s.ledgerRow}>
              <span className={s.ledgerLabel}>− TDS (10%)</span>
              <span className={`${s.ledgerFig} ${s.deduction}`}>−₹{result.tds?.toLocaleString('en-IN')}</span>
            </div>
            <div className={`${s.ledgerRow} ${s.ledgerNet}`}>
              <span className={s.ledgerLabel}>
                Estimated Net Payable
                <span className={s.ledgerNote}>Subject to HR approval</span>
              </span>
              <span className={s.netFig}>₹{result.netPayable?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
