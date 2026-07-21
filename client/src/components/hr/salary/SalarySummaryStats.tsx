import type { SalaryResult } from '@/types'

interface SalarySummaryStatsProps {
  result: SalaryResult
}

export function SalarySummaryStats({ result }: SalarySummaryStatsProps) {
  return (
    <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
      {([
        ['Hours Logged',  result.hoursLogged   != null ? `${result.hoursLogged} hrs` : null,  '⏱', 'var(--color-primary)'],
        ['Days Worked',   result.daysWorked    != null ? `${result.daysWorked} days` : null,   '📅', 'var(--color-accent)'],
        ['Leaves Taken',  result.leavesTaken   != null && result.leavesTaken > 0 ? `${result.leavesTaken} days` : null, '🌴', 'var(--color-warning)'],
        ['Base Salary',   result.baseSalary    != null ? `₹${result.baseSalary.toLocaleString('en-IN')}` : null, '💰', 'var(--color-success)'],
        ['Overtime',      result.overtimePay   != null && result.overtimePay > 0 ? `₹${result.overtimePay.toLocaleString('en-IN')}` : null, '⚡', 'var(--color-info)'],
        ['Penalties',     result.penalties     != null && result.penalties    > 0 ? `₹${result.penalties.toLocaleString('en-IN')}` : null, '❌', 'var(--color-danger)'],
      ] as [string, string | null, string, string][]).filter(([, v]) => v != null).map(([label, value, icon]) => (
        <div key={String(label)} className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">{label}</div>
              <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-text)', marginTop: '0.25rem' }}>{value}</div>
            </div>
            <span style={{ fontSize: '1.25rem', opacity: 0.7 }}>{icon}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
