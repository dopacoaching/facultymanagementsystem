import { SkeletonTable, EmptyState } from '@/components/ui/Skeleton'
import { MONTHS } from './types'
import type { ReportRow } from './types'

interface ReportsTableProps {
  loading: boolean
  rows: ReportRow[]
  total: number
  month: number
  year: number
}

export function ReportsTable({ loading, rows, total, month, year }: ReportsTableProps) {
  return (
    <div className="card">
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No approved salaries"
          description={`No salaries have been approved for ${MONTHS[month - 1]} ${year}. Calculate and approve salaries from the Salary Calculator.`}
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
                  <td style={{ color: 'var(--color-text-secondary)' }}>{MONTHS[r.month - 1]} {r.year}</td>
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
                <tr style={{ background: 'rgba(79,70,229,.04)' }}>
                  <td colSpan={3} style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    Total Payroll — {MONTHS[month - 1]} {year}
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
