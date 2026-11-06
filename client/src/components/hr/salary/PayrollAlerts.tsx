import type { SalaryAlert } from '@/types'
import { alertClass, alertIcon } from './types'
import s from './Salary.module.css'

interface PayrollAlertsProps {
  alerts: SalaryAlert[]
}

export function PayrollAlerts({ alerts }: PayrollAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className={s.block}>
      <p className="section-label">Payroll Alerts</p>
      <div className={s.alertList}>
        {alerts.map((alert, i) => (
          <div key={i} className={alertClass(alert.level)}>
            <span className="alert-icon" aria-hidden="true">{alertIcon(alert.level)}</span>
            <div>
              <strong className={s.alertCode}>[{alert.code}]</strong> {alert.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
