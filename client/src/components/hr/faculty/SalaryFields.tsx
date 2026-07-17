import type { Faculty } from '@/types'

interface SalaryFieldsProps {
  editing: Partial<Faculty>
  setEditing: (f: Partial<Faculty>) => void
}

export function SalaryFields({ editing, setEditing }: SalaryFieldsProps) {
  const model = editing.salaryModel ?? ''
  const set = (key: keyof Faculty, val: unknown) => setEditing({ ...editing, [key]: val })

  if (model === 'HOURLY') {
    return (
      <div className="form-group">
        <label className="label">Hourly Rate (₹)</label>
        <input type="number" className="input" value={editing.hourlyRate ?? ''} onChange={(e) => set('hourlyRate', +e.target.value)} placeholder="e.g. 850" />
      </div>
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
