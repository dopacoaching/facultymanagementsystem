import type { SalaryBreakdown } from '@/types'
import s from './Salary.module.css'

interface PayBreakdownTableProps {
  breakdown: SalaryBreakdown[]
}

export function PayBreakdownTable({ breakdown }: PayBreakdownTableProps) {
  if (breakdown.length === 0) return null

  return (
    <div className={s.block}>
      <p className="section-label">Pay Breakdown</p>
      <div className="table-wrapper">
        <table className={s.lines}>
          <tbody>
            {breakdown.map((row, i) => (
              <tr key={i}>
                <td className={row.isDeduction ? s.deduction : undefined}>
                  {row.isDeduction ? '− ' : ''}{row.label}
                </td>
                <td className={`amt ${row.isDeduction ? s.deduction : ''}`}>
                  {/* "Rate"/"Pay"/"Salary" labels are always a ₹ amount even when they
                      mention "hour" (e.g. "Rate per Hour") — check those before the
                      generic hours/quota match, which is for label text stating a
                      quantity of hours, not a per-hour price. */}
                  {/\brate\b|\bpay\b|\bsalary\b/i.test(row.label)
                    ? `₹${row.amount.toLocaleString('en-IN')}`
                    : /\bhours?\b|\bhrs\b|\bquota\b/i.test(row.label)
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
  )
}
