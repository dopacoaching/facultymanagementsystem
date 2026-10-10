import type { Faculty } from '@/types'

interface SalaryFieldsProps {
  editing: Partial<Faculty>
  setEditing: (f: Partial<Faculty>) => void
  /** Hourly rate as loaded (edit mode only). A different value needs an effective date. */
  originalRate?: number
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SalaryFields({ editing, setEditing, originalRate }: SalaryFieldsProps) {
  const model = editing.salaryModel ?? ''
  const set = (key: keyof Faculty, val: unknown) => setEditing({ ...editing, [key]: val })

  if (model === 'HOURLY') {
    const isEdit = '_id' in editing
    const changed = isEdit && editing.hourlyRate != null && editing.hourlyRate !== originalRate
    const history = (editing.hourlyRateHistory ?? []).slice().reverse()
    return (
      <>
        {isEdit && originalRate != null && (
          <div className="form-group">
            <label className="label">Current Hourly Rate</label>
            <div className="input" style={{ background: 'var(--color-surface-2)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              ₹{originalRate}/hr
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="label">{isEdit && originalRate != null ? 'New Hourly Rate (₹)' : 'Hourly Rate (₹)'}</label>
          <input
            type="number" min={1} step="any" className="input"
            value={editing.hourlyRate ?? ''}
            onChange={(e) => set('hourlyRate', e.target.value === '' ? undefined : +e.target.value)}
            placeholder="e.g. 850"
          />
          {!isEdit && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              You can change this later and choose the date it takes effect.
            </div>
          )}
        </div>

        {changed && (
          <div className="form-group">
            <label className="label">New rate effective from</label>
            <input
              type="date" className="input" required
              value={editing.hourlyRateEffectiveFrom ?? ''}
              onChange={(e) => set('hourlyRateEffectiveFrom', e.target.value)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              {originalRate != null
                ? <>Changing ₹{originalRate} → ₹{editing.hourlyRate}. Hours on or after this date use the new rate; earlier hours keep ₹{originalRate}.</>
                : <>Setting ₹{editing.hourlyRate}/hr. Pick the date it starts applying.</>}
            </div>
          </div>
        )}

        {isEdit && history.length > 0 && (
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="label">Rate history</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem' }}>
              {history.map((h, i) => {
                const initial = new Date(h.effectiveFrom).getTime() === 0
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0.625rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)' }}>
                    <strong>₹{h.rate}/hr</strong>
                    <span style={{ color: 'var(--color-muted)' }}>
                      {initial ? 'Initial rate' : `from ${fmtDate(h.effectiveFrom)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>
    )
  }

  if (model === 'FIXED_MONTHLY') {
    return (
      <>
        <div className="form-group">
          <label className="label">Fixed Monthly Salary (₹)</label>
          <input type="number" className="input" value={editing.fixedMonthlySalary ?? ''} onChange={(e) => set('fixedMonthlySalary', +e.target.value)} placeholder="e.g. 40000" />
        </div>
        <div className="form-group">
          <label className="label">Monthly Leave Allowance (days)</label>
          <input type="number" className="input" value={editing.monthlyLeaveAllowance ?? ''} onChange={(e) => set('monthlyLeaveAllowance', +e.target.value)} placeholder="e.g. 8" />
        </div>
        <div className="form-group">
          <label className="label">April Leave Allowance (days)</label>
          <input type="number" className="input" value={editing.aprilLeaveAllowance ?? ''} onChange={(e) => set('aprilLeaveAllowance', +e.target.value)} placeholder="e.g. 4" />
        </div>
      </>
    )
  }

  if (model === 'FIXED_WITH_QUOTA') {
    return (
      <>
        <div className="form-group">
          <label className="label">Fixed Monthly Salary (₹)</label>
          <input type="number" className="input" value={editing.fixedMonthlySalary ?? ''} onChange={(e) => set('fixedMonthlySalary', +e.target.value)} placeholder="e.g. 50000" />
        </div>
        <div className="form-group">
          <label className="label">Monthly Hour Quota</label>
          <input type="number" className="input" value={editing.monthlyHourQuota ?? ''} onChange={(e) => set('monthlyHourQuota', +e.target.value)} placeholder="e.g. 60" />
        </div>
      </>
    )
  }

  if (model === 'SPLIT_FIXED_VARIABLE') {
    return (
      <>
        <div className="form-group">
          <label className="label">Fixed Component (₹)</label>
          <input type="number" className="input" value={editing.fixedComponent ?? ''} onChange={(e) => set('fixedComponent', +e.target.value)} placeholder="e.g. 50000" />
        </div>
        <div className="form-group">
          <label className="label">Variable Component (₹)</label>
          <input type="number" className="input" value={editing.variableComponent ?? ''} onChange={(e) => set('variableComponent', +e.target.value)} placeholder="e.g. 150000" />
        </div>
      </>
    )
  }

  if (model === 'CONFIGURABLE') {
    return (
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <div className="alert alert-warning" style={{ marginBottom: 0 }}>
          <span className="alert-icon">⚙️</span>
          <div>
            <strong>CONFIGURABLE Model</strong>
            <div style={{ fontWeight: 400, marginTop: '0.2rem' }}>
              Use the <strong>Configure Pay</strong> button in the faculty list to set this faculty&#39;s pay configuration JSON.
              Salary calculation will be blocked until configured.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
