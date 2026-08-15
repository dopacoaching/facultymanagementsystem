import { SUBJECT_OPTIONS } from './types'

interface SubjectFieldProps {
  value: string
  onChange: (v: string) => void
}

export function SubjectField({ value, onChange }: SubjectFieldProps) {
  return (
    <div className="form-group">
      <label className="label">Subject</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select subject —</option>
        {SUBJECT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  )
}
