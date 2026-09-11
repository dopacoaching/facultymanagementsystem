import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { periodText } from './types'
import type { ReportRow } from './types'

interface ReportsTableProps {
  loading: boolean
  rows: ReportRow[]
  total: number
  periodLabel: string
}

export function ReportsTable({ loading, rows, total, periodLabel }: ReportsTableProps) {
  return (
    <div className="card">
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No approved salaries"
          description={`No salaries have been approved for ${periodLabel}. Calculate and approve salaries from the Salary Calculator.`}
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Subject</th>
                <th>Period</th>
                <th style={{ textAlign: 'right' }}>Final Payable</th>
                <th>Status</th>
                <th>Approved At</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{r.subject}</td>
                  <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{periodText(r)}</td>
                  <td style={{ fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{r.finalPayable?.toLocaleString('en-IN')}
                  </td>
                  <td><span className="badge badge-green">{r.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(r.approvedAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr style={{ background: 'rgba(13,148,136,.04)' }}>
                  <td colSpan={3} style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    Total Payroll — {periodLabel}
                  </td>
                  <td style={{ fontWeight: 800, textAlign: 'right', fontSize: '1rem', color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{total.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
