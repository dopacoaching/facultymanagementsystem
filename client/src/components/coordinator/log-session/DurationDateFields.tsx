import { todayLocal } from '@/utils/date'
import { MINUTE_OPTIONS } from './types'

interface DurationDateFieldsProps {
  startTime: string
  onStartTimeChange: (v: string) => void
  durationHours: number
  onDurationHoursChange: (v: number) => void
  durationMinutes: number
  onDurationMinutesChange: (v: number) => void
  sessionDate: string
  onSessionDateChange: (v: string) => void
}

export function DurationDateFields({
  startTime, onStartTimeChange, durationHours, onDurationHoursChange,
  durationMinutes, onDurationMinutesChange, sessionDate, onSessionDateChange,
}: DurationDateFieldsProps) {
  return (
    <div className="input-group">
      <div className="form-group">
        <label className="label">Start Time</label>
        <input
          type="time"
          className="input"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="label">Duration</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            className="input"
            min={0}
            max={12}
            style={{ width: '5rem' }}
            value={durationHours}
            onChange={(e) => onDurationHoursChange(+e.target.value)}
            placeholder="hrs"
          />
          <select
            className="input"
            style={{ width: '5rem' }}
            value={durationMinutes}
            onChange={(e) => onDurationMinutesChange(+e.target.value)}
          >
            {MINUTE_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}m</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="label">Session Date</label>
        <input
          type="date"
          className="input"
          value={sessionDate}
          max={todayLocal()}
          onChange={(e) => onSessionDateChange(e.target.value)}
        />
      </div>
    </div>
  )
}
