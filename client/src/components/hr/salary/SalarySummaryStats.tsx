import type { SalaryResult } from '@/types'
import { Icon, type IconName } from '@/components/ui/Icon'
import s from './Salary.module.css'

interface SalarySummaryStatsProps {
  result: SalaryResult
}

export function SalarySummaryStats({ result }: SalarySummaryStatsProps) {
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
  const items: [string, string | null, IconName, boolean][] = [
    ['Hours Logged',  result.hoursLogged   != null ? `${result.hoursLogged} hrs` : null,  'clock',    false],
    ['Days Worked',   result.daysWorked    != null ? `${result.daysWorked} days` : null,   'calendar', false],
    ['Leaves Taken',  result.leavesTaken   != null && result.leavesTaken > 0 ? `${result.leavesTaken} days` : null, 'calendar', false],
    ['Base Salary',   result.baseSalary    != null ? inr(result.baseSalary) : null, 'wallet', false],
    ['Overtime',      result.overtimePay   != null && result.overtimePay > 0 ? inr(result.overtimePay) : null, 'chart', false],
    ['Penalties',     result.penalties     != null && result.penalties    > 0 ? inr(result.penalties) : null, 'alert', true],
  ]
  return (
    <div className={s.facts}>
      {items.filter(([, v]) => v != null).map(([label, value, icon, bad]) => (
        <div key={label} className={`${s.fact} ${bad ? s.factBad : ''}`}>
          <span className={s.factLabel}><Icon name={icon} size={13} />{label}</span>
          <span className={s.factValue}>{value}</span>
        </div>
      ))}
    </div>
  )
}
