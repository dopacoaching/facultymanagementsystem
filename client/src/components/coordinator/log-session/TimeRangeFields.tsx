import { todayLocal } from '@/utils/date'
import type { DurationResult } from './types'

interface TimeRangeFieldsProps {
  scheduledTime: string
  onScheduledTimeChange: (v: string) => void
  startTime: string
  onStartTimeChange: (v: string) => void
  endTime: string
  onEndTimeChange: (v: string) => void
  breakMinutes: string
  onBreakMinutesChange: (v: string) => void
  sessionDate: string
  onSessionDateChange: (v: string) => void
  duration: DurationResult
}

function formatHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function TimeRangeFields({
  scheduledTime, onScheduledTimeChange,
  startTime, onStartTimeChange, endTime, onEndTimeChange,
  breakMinutes, onBreakMinutesChange, sessionDate, onSessionDateChange, duration,
}: TimeRangeFieldsProps) {
  return (
    <>
      <div className="input-group">
        <div className="form-group">
          <label className="label">Scheduled Time (optional)</label>
          <input
            type="time"
            className="input"
            value={scheduledTime}
            onChange={(e) => onScheduledTimeChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Class Start Time</label>
          <input
            type="time"
            className="input"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Class End Time</label>
          <input
            type="time"
            className="input"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Break (minutes, optional)</label>
          <input
            type="number"
            className="input"
            min={0}
            value={breakMinutes}
            onChange={(e) => onBreakMinutesChange(e.target.value)}
            placeholder="e.g. 15"
          />
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

      {!duration.error && startTime && endTime && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', margin: '0.5rem 0 0' }}>
          Payable duration: <strong style={{ color: 'var(--color-text)' }}>{formatHM(duration.hours * 60)}</strong>
          {duration.deductedMinutes > 0 && (
            <> &nbsp;·&nbsp; {duration.breakMinutes}m break, {duration.deductedMinutes}m deducted (first 15m free)</>
          )}
        </p>
      )}
    </>
  )
}
