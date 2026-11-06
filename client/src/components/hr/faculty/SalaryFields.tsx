import type { Faculty } from '@/types'
import s from './Faculty.module.css'

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
            <span className="label">Current Hourly Rate</span>
            <div className={`input ${s.readonlyRate}`}>₹{originalRate}/hr</div>
          </div>
        )}

        <div className="form-group">
          <label className="label" htmlFor="fac-rate">{isEdit && originalRate != null ? 'New Hourly Rate (₹)' : 'Hourly Rate (₹)'}</label>
          <input
            id="fac-rate" type="number" min={1} step="any" className="input"
            value={editing.hourlyRate ?? ''}
            onChange={(e) => set('hourlyRate', e.target.value === '' ? undefined : +e.target.value)}
            placeholder="e.g. 850"
          />
          {!isEdit && (
            <div className="help-text">You can change this later and choose the date it takes effect.</div>
          )}
        </div>

        {changed && (
          <div className="form-group">
            <label className="label" htmlFor="fac-rate-from">New rate effective from</label>
            <input
              id="fac-rate-from" type="date" className="input" required
              value={editing.hourlyRateEffectiveFrom ?? ''}
              onChange={(e) => set('hourlyRateEffectiveFrom', e.target.value)}
            />
            <div className="help-text">
              {originalRate != null
                ? <>Changing ₹{originalRate} → ₹{editing.hourlyRate}. Hours on or after this date use the new rate; earlier hours keep ₹{originalRate}.</>
                : <>Setting ₹{editing.hourlyRate}/hr. Pick the date it starts applying.</>}
            </div>
          </div>
        )}

        {isEdit && history.length > 0 && (
          <div className="form-group field-col-span">
            <span className="label">Rate history</span>
            <div className={s.history}>
              {history.map((h, i) => {
                const initial = new Date(h.effectiveFrom).getTime() === 0
                return (
                  <div key={i} className={s.historyRow}>
                    <strong>₹{h.rate}/hr</strong>
                    <span>{initial ? 'Initial rate' : `from ${fmtDate(h.effectiveFrom)}`}</span>
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
          <label className="label" htmlFor="fac-fixed">Fixed Monthly Salary (₹)</label>
          <input id="fac-fixed" type="number" className="input" value={editing.fixedMonthlySalary ?? ''} onChange={(e) => set('fixedMonthlySalary', +e.target.value)} placeholder="e.g. 40000" />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="fac-leave">Monthly Leave Allowance (days)</label>
          <input id="fac-leave" type="number" className="input" value={editing.monthlyLeaveAllowance ?? ''} onChange={(e) => set('monthlyLeaveAllowance', +e.target.value)} placeholder="e.g. 8" />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="fac-april">April Leave Allowance (days)</label>
          <input id="fac-april" type="number" className="input" value={editing.aprilLeaveAllowance ?? ''} onChange={(e) => set('aprilLeaveAllowance', +e.target.value)} placeholder="e.g. 4" />
        </div>
      </>
    )
  }

  if (model === 'FIXED_WITH_QUOTA') {
    return (
      <>
        <div className="form-group">
          <label className="label" htmlFor="fac-fixed-q">Fixed Monthly Salary (₹)</label>
          <input id="fac-fixed-q" type="number" className="input" value={editing.fixedMonthlySalary ?? ''} onChange={(e) => set('fixedMonthlySalary', +e.target.value)} placeholder="e.g. 50000" />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="fac-quota">Monthly Hour Quota</label>
          <input id="fac-quota" type="number" className="input" value={editing.monthlyHourQuota ?? ''} onChange={(e) => set('monthlyHourQuota', +e.target.value)} placeholder="e.g. 60" />
        </div>
      </>
    )
  }

  if (model === 'SPLIT_FIXED_VARIABLE') {
    return (
      <>
        <div className="form-group">
          <label className="label" htmlFor="fac-fixed-c">Fixed Component (₹)</label>
          <input id="fac-fixed-c" type="number" className="input" value={editing.fixedComponent ?? ''} onChange={(e) => set('fixedComponent', +e.target.value)} placeholder="e.g. 50000" />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="fac-var-c">Variable Component (₹)</label>
          <input id="fac-var-c" type="number" className="input" value={editing.variableComponent ?? ''} onChange={(e) => set('variableComponent', +e.target.value)} placeholder="e.g. 150000" />
        </div>
      </>
    )
  }

  if (model === 'CONFIGURABLE') {
    return (
      <div className="field-col-span">
        <div className="alert alert-warning">
          <span className="alert-icon">!</span>
          <div>
            <strong>CONFIGURABLE Model</strong>
            <div className="mt-1">
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
