import { toLocalISO } from '@/utils/date'

type PresetKey = 'thisWeek' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisYear'

interface DateRangeFilterProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  loading?: boolean
  onApply?: () => void
  applyLabel?: string
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
  from, to, onFromChange, onToChange, loading, onApply, applyLabel = 'Apply',
}: DateRangeFilterProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label">From</label>
          <input type="date" className="input" value={from} max={to || undefined}
            onChange={(e) => onFromChange(e.target.value)} style={{ minWidth: 150 }} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label">To</label>
          <input type="date" className="input" value={to} min={from || undefined}
            onChange={(e) => onToChange(e.target.value)} style={{ minWidth: 150 }} />
        </div>
        {onApply && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onApply}
            disabled={loading || !from || !to}
            style={{ alignSelf: 'flex-end' }}
          >
            {loading ? (
              <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Loading…</>
            ) : applyLabel}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', alignSelf: 'center' }}>Quick range:</span>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { const r = presetRange(p.key); onFromChange(r.from); onToChange(r.to) }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
