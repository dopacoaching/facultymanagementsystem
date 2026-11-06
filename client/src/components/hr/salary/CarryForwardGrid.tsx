import type { SalaryCarryForward } from '@/types'
import s from './Salary.module.css'

interface CarryForwardGridProps {
  carryForward: SalaryCarryForward
}

export function CarryForwardGrid({ carryForward }: CarryForwardGridProps) {
  const cells = [
    { label: 'Prev Month Balance', value: `${carryForward.previousMonthBalance.toFixed(1)} hrs`, tone: s.carryWarn, extra: '' },
    { label: 'This Month Balance', value: `${carryForward.currentMonthBalance.toFixed(1)} hrs`,  tone: s.carryBad,  extra: '' },
    { label: 'Combined Total',     value: `${carryForward.combinedTotal.toFixed(1)} hrs`,        tone: s.carryBad,  extra: s.total },
  ]
  return (
    <div className={s.block}>
      <p className="section-label">Hour Carry-Forward</p>
      <div className={s.carry}>
        {cells.map(({ label, value, tone, extra }) => (
          <div key={label} className={`${s.carryCell} ${extra}`}>
            <div className={s.carryLabel}>{label}</div>
            <div className={`${s.carryValue} ${tone}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
