import Link from 'next/link'
import type { SalaryResult } from '@/types'
import { Icon } from '@/components/ui/Icon'
import { MONTHS } from './types'
import s from '../Portal.module.css'

interface SalarySnapshotCardProps {
  salary: SalaryResult
  month: number
  year: number
}

export function SalarySnapshotCard({ salary, month, year }: SalarySnapshotCardProps) {
  const rows = ([
    ['Hours Logged', salary.hoursLogged != null ? `${salary.hoursLogged} hrs` : null],
    ['Days Worked',  salary.daysWorked  != null ? `${salary.daysWorked} days` : null],
    ['Balance Hours (to reach quota)', salary.monthBalance != null ? `${salary.monthBalance} hrs` : null],
    ['Base Salary',  salary.baseSalary  != null ? `₹${salary.baseSalary.toLocaleString('en-IN')}` : null],
    ['Deductions',   salary.penalties   ? `−₹${salary.penalties.toLocaleString('en-IN')}` : null],
  ] as [string, string | null][]).filter(([, v]) => v != null)

  return (
    <div className="card">
      <div className="card-header">
        <h2>Salary Estimate — {MONTHS[month - 1]} {year}</h2>
        <span className={`badge badge-dot ${salary.status === 'OK' ? 'badge-green' : 'badge-yellow'}`}>
          {salary.status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className={s.facts}>
        {rows.map(([label, value]) => (
          <div key={label} className={`${s.fact} ${label === 'Deductions' ? s.factBad : ''}`}>
            <span className={s.factLabel}>{label}</span>
            <span className={s.factValue}>{value}</span>
          </div>
        ))}
      </div>

      {/* Pay breakdown — itemized payment details, most useful for temporary/hourly faculty */}
      {salary.breakdown && salary.breakdown.length > 0 && (
        <div className={s.block}>
          <p className="section-label">Payment Details</p>
          <div className="table-wrapper">
            <table className={s.lines}>
              <tbody>
                {salary.breakdown.map((row, i) => (
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
        <div className={`${s.ledgerRow} ${s.ledgerNet}`}>
          <span className={s.ledgerLabel}>
            Estimated Payable
            <span className={s.ledgerNote}>Subject to HR approval</span>
          </span>
          <span className={s.netFig}>₹{salary.finalPayable?.toLocaleString('en-IN')}</span>
        </div>
      </div>
      <div className="text-right mt-4">
        <Link href="/faculty/salary" className={s.sectionLink}>
          Full salary details <Icon name="chevronRight" size={12} />
        </Link>
      </div>
    </div>
  )
}
