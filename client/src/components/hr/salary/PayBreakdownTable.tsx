import type { SalaryBreakdown } from '@/types'

interface PayBreakdownTableProps {
  breakdown: SalaryBreakdown[]
}

export function PayBreakdownTable({ breakdown }: PayBreakdownTableProps) {
  if (breakdown.length === 0) return null

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p className="section-label">Pay Breakdown</p>
      <div className="table-wrapper">
        <table>
          <tbody>
            {breakdown.map((row, i) => (
              <tr key={i}>
                <td style={{ color: row.isDeduction ? 'var(--color-danger)' : 'var(--color-text)' }}>
                  {row.isDeduction ? '− ' : ''}{row.label}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: row.isDeduction ? 'var(--color-danger)' : 'var(--color-text)' }}>
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
  )
}
