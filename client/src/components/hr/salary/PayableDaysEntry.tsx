'use client'
import { useState } from 'react'

interface PayableDaysEntryProps {
  saving: boolean
  onSave: (payableDays: number) => void
}

/** Inline entry for OFFICE_STAFF_LEAVE_BASED faculty — HR types the final
 *  Payable Days figure for the month; payroll is blocked until this is saved. */
export function PayableDaysEntry({ saving, onSave }: PayableDaysEntryProps) {
  const [value, setValue] = useState('')
  const num = Number(value)
  const valid = value !== '' && !isNaN(num) && num >= 0 && num <= 31

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="label">Payable Days for this month</label>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
          Total days present + paid leave, as computed by HR at month-end.
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            className="input"
            style={{ maxWidth: 120 }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min={0}
            max={31}
            placeholder="e.g. 25"
            disabled={saving}
          />
          <button
            className="btn btn-primary"
            disabled={!valid || saving}
            onClick={() => onSave(num)}
          >
            {saving ? (
              <><span className="spinner" /> Saving…</>
            ) : 'Save & Calculate'}
          </button>
        </div>
      </div>
    </div>
  )
}
