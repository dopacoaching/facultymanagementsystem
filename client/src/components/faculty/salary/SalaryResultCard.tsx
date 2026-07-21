import type { SalaryResult } from '@/types'
import type { HoursSummaryResponse } from '@/services/salary.service'
import { MONTHS } from './types'

interface SalaryResultCardProps {
  result: SalaryResult
  month: number
  year: number
  hoursSummary: HoursSummaryResponse | null
}

export function SalaryResultCard({ result, month, year, hoursSummary }: SalaryResultCardProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h2>{MONTHS[month - 1]} {year}</h2>
        <span className={`badge ${result.status === 'OK' ? 'badge-green' : result.status === 'HR_REVIEW' ? 'badge-yellow' : 'badge-red'}`}>
          {result.status.replace(/_/g, ' ')}
        </span>
      </div>

      {result.status === 'BLOCKED' && result.reason && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <span className="alert-icon">🚫</span>
          <div>{result.reason}</div>
        </div>
      )}

      {result.status === 'PENDING_CONFIG' && (
        <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
          <span className="alert-icon">⚙</span>
          <div>Your pay contract is being configured by HR. Please check back later.</div>
        </div>
      )}

      {(result.status === 'OK' || result.status === 'HR_REVIEW') && (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
            {([
              ['Hours This Month', result.hoursLogged  != null ? `${result.hoursLogged} hrs` : null, '⏱'],
              ['Total Hours (All Time)', hoursSummary != null ? `${hoursSummary.allTimeTotalHours.toFixed(1)} hrs` : null, '📊'],
              ['Balance Hours (to reach quota)', result.monthBalance != null ? `${result.monthBalance} hrs` : null, '⚖️'],
            ] as [string, string | null, string][]).filter(([, v]) => v != null).map(([label, value, icon]) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">{label}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.375rem', marginTop: '0.25rem', color: 'var(--color-primary)' }}>
                      {value}
                    </div>
                  </div>
                  <span style={{ fontSize: '1.4rem', opacity: 0.5 }}>{icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pay breakdown — itemized payment details, most useful for temporary/hourly faculty */}
          {result.breakdown && result.breakdown.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p className="section-label">Payment Details</p>
              <div className="table-wrapper">
                <table>
                  <tbody>
                    {result.breakdown.map((row, i) => (
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
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '0.75rem',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
            color: '#fff', borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(79,70,229,.3)',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', opacity: 0.9 }}>Estimated Payable</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.15rem' }}>Subject to HR approval</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
              ₹{result.finalPayable?.toLocaleString('en-IN')}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
