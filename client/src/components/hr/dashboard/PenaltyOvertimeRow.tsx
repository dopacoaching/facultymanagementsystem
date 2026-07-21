import type { DashboardData } from '@/services/salary.service'
import { MONTHS } from './types'

interface PenaltyOvertimeRowProps {
  totals: DashboardData['totals'] | undefined
  month: number
  year: number
}

export function PenaltyOvertimeRow({ totals: t, month, year }: PenaltyOvertimeRowProps) {
  if (!t || (t.totalPenalties <= 0 && t.totalOvertimePay <= 0)) return null

  return (
    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
      {t.totalPenalties > 0 && (
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
          <div className="stat-label">Total Penalties Applied</div>
          <div className="stat-value" style={{ color: 'var(--color-danger)', fontSize: '1.375rem' }}>
            ₹{t.totalPenalties.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">{MONTHS[month - 1]} {year} · approved records only</div>
        </div>
      )}
      {t.totalOvertimePay > 0 && (
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent)' }}>
          <div className="stat-label">Overtime Pay</div>
          <div className="stat-value" style={{ color: 'var(--color-accent)', fontSize: '1.375rem' }}>
            ₹{t.totalOvertimePay.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">{t.totalOvertimeHours.toFixed(1)} hrs overtime</div>
        </div>
      )}
      {t.totalPayroll > 0 && (
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
          <div className="stat-label">Total Payroll Approved</div>
          <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.375rem' }}>
            ₹{t.totalPayroll.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">{t.approved} of {t.totalFaculty} faculty</div>
        </div>
      )}
    </div>
  )
}
