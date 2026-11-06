import { useId } from 'react'
import type { Faculty } from '@/types'
import { MONTHS } from './types'
import { toLocalISO } from '@/utils/date'
import s from './Salary.module.css'

type Mode = 'MONTH' | 'RANGE'

interface SalaryControlsProps {
  faculty: Faculty[]
  selectedId: string
  onSelectFaculty: (id: string) => void
  mode: Mode
  month: number
  onMonthChange: (m: number) => void
  year: number
  onYearChange: (y: number) => void
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  loading: boolean
  onCalculate: () => void
}

function presetRange(key: 'thisWeek' | 'last7' | 'thisMonth' | 'lastMonth'): { from: string; to: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (key) {
    case 'thisWeek': {
      // Week starts Monday.
      const dow = (today.getDay() + 6) % 7
      const start = new Date(today); start.setDate(today.getDate() - dow)
      return { from: toLocalISO(start), to: toLocalISO(today) }
    }
    case 'last7': {
      const start = new Date(today); start.setDate(today.getDate() - 6)
      return { from: toLocalISO(start), to: toLocalISO(today) }
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: toLocalISO(start), to: toLocalISO(today) }
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: toLocalISO(start), to: toLocalISO(end) }
    }
  }
}

const PRESETS: { key: 'thisWeek' | 'last7' | 'thisMonth' | 'lastMonth'; label: string }[] = [
  { key: 'thisWeek', label: 'This week' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
]

export function SalaryControls({
  faculty, selectedId, onSelectFaculty, mode,
  month, onMonthChange, year, onYearChange,
  from, to, onFromChange, onToChange,
  loading, onCalculate,
}: SalaryControlsProps) {
  const uid = useId()
  return (
    <div className={`toolbar ${s.controls}`} role="group" aria-label="Salary calculation controls">
      <div className={s.controlsRow}>
        <div className={`form-group ${s.facultyField}`}>
          <label className="label" htmlFor={`${uid}-faculty`}>Faculty</label>
          <select id={`${uid}-faculty`} className="input" value={selectedId} onChange={(e) => onSelectFaculty(e.target.value)}>
            {faculty.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </div>

        {mode === 'RANGE' ? (
          <>
            <div className={`form-group ${s.dateField}`}>
              <label className="label" htmlFor={`${uid}-from`}>From</label>
              <input id={`${uid}-from`} type="date" className="input" value={from} max={to || undefined}
                onChange={(e) => onFromChange(e.target.value)} />
            </div>
            <div className={`form-group ${s.dateField}`}>
              <label className="label" htmlFor={`${uid}-to`}>To</label>
              <input id={`${uid}-to`} type="date" className="input" value={to} min={from || undefined}
                onChange={(e) => onToChange(e.target.value)} />
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        <button
          type="button"
          className={`btn btn-primary ${s.calc}`}
          onClick={onCalculate}
          disabled={loading || !selectedId || (mode === 'RANGE' && (!from || !to))}
        >
          {loading ? (
            <><span className="spinner spinner-on-solid" /> Calculating…</>
          ) : 'Calculate'}
        </button>
      </div>

      {mode === 'RANGE' && (
        <div className={s.presets}>
          <span className={s.presetLabel}>Quick range</span>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`chip ${s.chipBtn}`}
              onClick={() => { const r = presetRange(p.key); onFromChange(r.from); onToChange(r.to) }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
