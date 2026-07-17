import type { Faculty } from '@/types'
import { ClassEntry, ClassEntryDay, ClassSessionType, DAYS, SESSION_TYPE_LABELS } from './types'

interface ScheduleEntryRowProps {
  entry: ClassEntry
  idx: number
  faculty: Faculty[]
  onUpdate: (idx: number, key: keyof ClassEntry, val: string) => void
  onRemove: (idx: number) => void
}

export function ScheduleEntryRow({ entry, idx, faculty, onUpdate, onRemove }: ScheduleEntryRowProps) {
  const isExam = entry.sessionType === 'WEEKLY_EXAM' || entry.sessionType === 'MONTHLY_EXAM'
  const showLabel = idx === 0

  return (
    <div className="schedule-entry-row">
      {/* Type — always first */}
      <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
        {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Type</label>}
        <select className="input" value={entry.sessionType}
          onChange={(e) => onUpdate(idx, 'sessionType', e.target.value as ClassSessionType)}
          style={{ fontSize: '0.8125rem' }}>
          {(Object.keys(SESSION_TYPE_LABELS) as ClassSessionType[]).map((t) => (
            <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Day dropdown — class sessions only; auto-set when sessionDate is picked */}
      {!isExam && (
        <div className="form-group" style={{ margin: 0 }}>
          {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Day</label>}
          <select className="input" value={entry.day}
            onChange={(e) => onUpdate(idx, 'day', e.target.value as ClassEntryDay)}
            style={{ fontSize: '0.8125rem' }}>
            {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      )}

      {/* Date picker — class sessions: required, auto-derives day */}
      {!isExam && (
        <div className="form-group" style={{ margin: 0 }}>
          {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Date</label>}
          <input type="date" className="input" value={entry.sessionDate ?? ''}
            onChange={(e) => onUpdate(idx, 'sessionDate', e.target.value)}
            style={{ fontSize: '0.8125rem' }} required />
        </div>
      )}

      {/* Start time — class sessions: optional */}
      {!isExam && (
        <div className="form-group" style={{ margin: 0, minWidth: 110 }}>
          {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Start Time</label>}
          <input type="time" className="input" value={entry.startTime ?? ''}
            onChange={(e) => onUpdate(idx, 'startTime', e.target.value)}
            style={{ fontSize: '0.8125rem' }} />
        </div>
      )}

      {/* Weekly exam day (Mon/Fri) */}
      {entry.sessionType === 'WEEKLY_EXAM' && (
        <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
          {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Exam Day</label>}
          <select className="input" value={entry.examDay ?? ''}
            onChange={(e) => onUpdate(idx, 'examDay', e.target.value)}
            style={{ fontSize: '0.8125rem' }}>
            <option value="">— day —</option>
            <option value="MONDAY">Monday</option>
            <option value="FRIDAY">Friday</option>
          </select>
        </div>
      )}

      {/* Exam date — both exam types */}
      {isExam && (
        <div className="form-group" style={{ margin: 0 }}>
          {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Exam Date</label>}
          <input type="date" className="input" value={entry.examDate ?? ''}
            onChange={(e) => onUpdate(idx, 'examDate', e.target.value)}
            style={{ fontSize: '0.8125rem' }} />
        </div>
      )}

      {/* Subject */}
      <div className="form-group" style={{ margin: 0 }}>
        {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Subject</label>}
        <input className="input" placeholder="Subject" value={entry.subject}
          onChange={(e) => onUpdate(idx, 'subject', e.target.value)}
          style={{ fontSize: '0.8125rem' }} />
      </div>

      {/* Chapter */}
      <div className="form-group" style={{ margin: 0 }}>
        {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Chapter / Topic</label>}
        <input className="input" placeholder="Chapter" value={entry.chapter}
          onChange={(e) => onUpdate(idx, 'chapter', e.target.value)}
          style={{ fontSize: '0.8125rem' }} />
      </div>

      {/* Faculty — class sessions only: required */}
      {!isExam && (
        <div className="form-group" style={{ margin: 0 }}>
          {showLabel && <label className="label" style={{ fontSize: '0.75rem' }}>Faculty</label>}
          <select className="input"
            value={typeof entry.facultyId === 'object' ? (entry.facultyId as {_id:string})._id : (entry.facultyId ?? '')}
            onChange={(e) => onUpdate(idx, 'facultyId', e.target.value)}
            style={{ fontSize: '0.8125rem' }} required>
            <option value="">— select faculty —</option>
            {faculty.filter((f) => f.isActive).map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </div>
      )}

      <button className="btn btn-ghost btn-sm" onClick={() => onRemove(idx)}
        style={{ alignSelf: 'flex-end', color: 'var(--color-danger)', paddingBottom: showLabel ? '0' : undefined }}>✕</button>
    </div>
  )
}
