import { useId } from 'react'
import { toLocalISO } from '@/utils/date'
import s from './DateRangeFilter.module.css'

type PresetKey = 'thisWeek' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisYear'

interface DateRangeFilterProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  loading?: boolean
  onApply?: () => void
  applyLabel?: string
  /** Longest range the page's API accepts; quick ranges longer than this are not offered. */
  maxDays?: number
}

function presetRange(key: PresetKey): { from: string; to: string } {
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
    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1)
      return { from: toLocalISO(start), to: toLocalISO(today) }
    }
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'thisWeek', label: 'This week' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'thisYear', label: 'This year' },
]

/** Reusable From/To date-range filter with quick-range presets. Replaces the
 *  month+year dropdown pattern across admin/HR reports and dashboards. */
export function DateRangeFilter({
  from, to, onFromChange, onToChange, loading, onApply, applyLabel = 'Apply', maxDays,
}: DateRangeFilterProps) {
  const uid = useId()
  return (
    <div className={s.root}>
      <div className={s.fields}>
        <div className={`form-group ${s.field}`}>
          <label className="label" htmlFor={`${uid}-from`}>From</label>
          <input id={`${uid}-from`} type="date" className="input" value={from} max={to || undefined}
            onChange={(e) => onFromChange(e.target.value)} />
        </div>
        <div className={`form-group ${s.field}`}>
          <label className="label" htmlFor={`${uid}-to`}>To</label>
          <input id={`${uid}-to`} type="date" className="input" value={to} min={from || undefined}
            onChange={(e) => onToChange(e.target.value)} />
        </div>
        {onApply && (
          <button
            type="button"
            className={`btn btn-primary ${s.apply}`}
            onClick={onApply}
            disabled={loading || !from || !to}
          >
            {loading ? (
              <><span className="spinner spinner-on-solid" /> Loading…</>
            ) : applyLabel}
          </button>
        )}
      </div>

      <div className={s.presets} role="group" aria-label="Quick range">
        <span className={s.presetsLabel}>Quick range</span>
        {PRESETS.filter((p) => {
          if (!maxDays) return true
          const r = presetRange(p.key)
          return (new Date(r.to).getTime() - new Date(r.from).getTime()) / 86_400_000 <= maxDays
        }).map((p) => (
          <button
            key={p.key}
            type="button"
            className={`btn btn-ghost btn-sm ${s.preset}`}
            onClick={() => { const r = presetRange(p.key); onFromChange(r.from); onToChange(r.to) }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
