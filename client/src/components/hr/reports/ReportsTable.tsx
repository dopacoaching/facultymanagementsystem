import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { periodText } from './types'
import type { ReportRow } from './types'
import s from './Reports.module.css'

interface ReportsTableProps {
  loading: boolean
  rows: ReportRow[]
  total: number
  periodLabel: string
}

export function ReportsTable({ loading, rows, total, periodLabel }: ReportsTableProps) {
  if (loading) return <div className="card card-flush"><SkeletonTable rows={5} cols={6} /></div>
  if (rows.length === 0) {
    return (
      <div className="card">
        <EmptyState
          title="No approved salaries"
          description={`No salaries have been approved for ${periodLabel}. Calculate and approve salaries from the Salary Calculator.`}
        />
      </div>
    )
  }
  return (
    <div className="table-wrapper table-stack">
      <table>
        <thead>
          <tr>
            <th>Faculty</th>
            <th>Subject</th>
            <th>Period</th>
            <th className="num" style={{ textAlign: 'right' }}>Final Payable</th>
            <th>Status</th>
            <th>Approved At</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td data-label="Faculty" className={s.strong}>{r.name}</td>
              <td data-label="Subject" className={s.muted}>{r.subject}</td>
              <td data-label="Period" className={`${s.muted} ${s.nowrap}`}>{periodText(r)}</td>
              <td data-label="Final Payable" className={`num ${s.strong}`} style={{ textAlign: 'right' }}>
                ₹{r.finalPayable?.toLocaleString('en-IN')}
              </td>
              <td data-label="Status"><span className="badge badge-green badge-dot">{r.status}</span></td>
              <td data-label="Approved At" className={`num ${s.faint} ${s.nowrap}`}>
                {new Date(r.approvedAt).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
          <tr style={{ background: 'var(--color-primary-ghost)' }}>
            <td colSpan={3} className={s.strong}>Total Payroll — {periodLabel}</td>
            <td data-label="Total" className="num" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
              ₹{total.toLocaleString('en-IN')}
            </td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
