'use client'
import { useId, useState } from 'react'
import s from './Salary.module.css'

interface PayableDaysEntryProps {
  saving: boolean
  onSave: (payableDays: number) => void
}

/** Inline entry for OFFICE_STAFF_LEAVE_BASED faculty — HR types the final
 *  Payable Days figure for the month; payroll is blocked until this is saved. */
export function PayableDaysEntry({ saving, onSave }: PayableDaysEntryProps) {
  const [value, setValue] = useState('')
  const id = useId()
  const num = Number(value)
  const valid = value !== '' && !isNaN(num) && num >= 0 && num <= 31

  return (
    <div className={s.payable}>
      <div className="form-group">
        <label className="label" htmlFor={id}>Payable Days for this month</label>
        <div className={s.payableHelp}>
          Total days present + paid leave, as computed by HR at month-end.
        </div>
        <div className={s.payableRow}>
          <input
            id={id}
            type="number"
            className={`input num ${s.payableInput}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min={0}
            max={31}
            placeholder="e.g. 25"
            disabled={saving}
          />
          <button
            type="button"
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
