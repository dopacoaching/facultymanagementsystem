import type { SalaryAlert } from '@/types'
import { alertClass, alertIcon } from './types'

interface PayrollAlertsProps {
  alerts: SalaryAlert[]
}

export function PayrollAlerts({ alerts }: PayrollAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
      <p className="section-label">Payroll Alerts</p>
      {alerts.map((alert, i) => (
        <div key={i} className={alertClass(alert.level)}>
          <span className="alert-icon">{alertIcon(alert.level)}</span>
          <div>
            <strong>[{alert.code}]</strong> {alert.message}
          </div>
        </div>
      ))}
    </div>
  )
}
