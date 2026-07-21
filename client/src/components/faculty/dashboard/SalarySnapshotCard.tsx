import Link from 'next/link'
import type { SalaryResult } from '@/types'
import { MONTHS } from './types'

interface SalarySnapshotCardProps {
  salary: SalaryResult
  month: number
  year: number
}

export function SalarySnapshotCard({ salary, month, year }: SalarySnapshotCardProps) {
  const rows = ([
    ['Hours Logged', salary.hoursLogged != null ? `${salary.hoursLogged} hrs` : null, '⏱'],
    ['Days Worked',  salary.daysWorked  != null ? `${salary.daysWorked} days` : null, '📅'],
    ['Balance Hours (to reach quota)', salary.monthBalance != null ? `${salary.monthBalance} hrs` : null, '⚖️'],
    ['Base Salary',  salary.baseSalary  != null ? `₹${salary.baseSalary.toLocaleString('en-IN')}` : null, '💰'],
    ['Deductions',   salary.penalties   ? `−₹${salary.penalties.toLocaleString('en-IN')}` : null, '📉'],
  ] as [string, string | null, string][]).filter(([, v]) => v != null)

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h2>Salary Estimate — {MONTHS[month - 1]} {year}</h2>
        <span className={`badge ${salary.status === 'OK' ? 'badge-green' : 'badge-yellow'}`}>
          {salary.status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="stats-grid">
        {rows.map(([label, value, icon]) => (
          <div key={label} className="stat-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{label}</div>
                <div style={{ fontWeight: 700, fontSize: '1.0625rem', marginTop: '0.25rem', color: label === 'Deductions' ? 'var(--color-danger)' : 'var(--color-text)' }}>{value}</div>
              </div>
              <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pay breakdown — itemized payment details, most useful for temporary/hourly faculty */}
      {salary.breakdown && salary.breakdown.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <p className="section-label">Payment Details</p>
          <div className="table-wrapper">
            <table>
              <tbody>
                {salary.breakdown.map((row, i) => (
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
      )}

      <div style={{
        marginTop: '1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.75rem',
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
        borderRadius: 'var(--radius-lg)', color: '#fff',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', opacity: 0.85 }}>Estimated Payable</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.1rem' }}>Subject to HR approval</div>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>₹{salary.finalPayable?.toLocaleString('en-IN')}</div>
      </div>
      <div style={{ textAlign: 'right', marginTop: '0.875rem' }}>
        <Link href="/faculty/salary" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Full salary details →
        </Link>
      </div>
    </div>
  )
}
