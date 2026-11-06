import { useId } from 'react'
import { MONTHS } from './types'
import s from '../Portal.module.css'

interface SalaryCheckFormProps {
  month: number
  onMonthChange: (m: number) => void
  year: number
  onYearChange: (y: number) => void
  loading: boolean
  onCheck: () => void
}

export function SalaryCheckForm({ month, onMonthChange, year, onYearChange, loading, onCheck }: SalaryCheckFormProps) {
  const uid = useId()
  return (
    <div className="toolbar" role="group" aria-label="Check salary for a month">
      <div className={s.checkRow}>
        <div className={`form-group ${s.monthField}`}>
          <label className="label" htmlFor={`${uid}-month`}>Month</label>
          <select id={`${uid}-month`} className="input" value={month} onChange={(e) => onMonthChange(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className={`form-group ${s.yearField}`}>
          <label className="label" htmlFor={`${uid}-year`}>Year</label>
          <input id={`${uid}-year`} type="number" className="input" value={year} onChange={(e) => onYearChange(+e.target.value)} />
        </div>
        <button
          type="button"
          className={`btn btn-primary ${s.checkBtn}`}
          onClick={onCheck}
          disabled={loading}
        >
          {loading ? <><span className="spinner spinner-on-solid" /> Checking…</> : 'Check Salary'}
        </button>
      </div>
    </div>
  )
}
