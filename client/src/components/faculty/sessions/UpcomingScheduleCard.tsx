import {
  ClassEntryDay, DAY_COLOR, DAY_LABELS, DAY_ORDER, ClassEntry,
  SESSION_BADGE, SESSION_LABELS, WeeklySchedule, fmt, getBatchName, getFacultyId,
} from './types'

interface UpcomingScheduleCardProps {
  schedule: WeeklySchedule
  today: Date
  facultyId: string | undefined
}

export function UpcomingScheduleCard({ schedule: s, today, facultyId }: UpcomingScheduleCardProps) {
  const isCurrent = new Date(s.weekStartDate) <= today && new Date(s.weekEndDate) >= today
  const batchName = getBatchName(s.batchId)

  // Group entries by day
  const byDay: Partial<Record<ClassEntryDay, ClassEntry[]>> = {}
  s.classEntries.forEach((e) => {
    if (!byDay[e.day]) byDay[e.day] = []
    byDay[e.day]!.push(e)
  })
  const days = DAY_ORDER.filter((d) => byDay[d]?.length)

  // Count my entries
  const myCount = s.classEntries.filter((e) => getFacultyId(e.facultyId) === facultyId).length

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${isCurrent ? 'var(--color-success)' : 'var(--color-primary)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <span style={{ fontWeight: 700 }}>{batchName}</span>
            {isCurrent && <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>📍 This Week</span>}
            {myCount > 0 && (
              <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                🎓 {myCount} session{myCount > 1 ? 's' : ''} assigned to you
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
            {fmt(s.weekStartDate)} → {fmt(s.weekEndDate)}
          </div>
        </div>
      </div>

      {(s.mondayExamTopic || s.fridayExamTopic) && (
        <div style={{
          display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
          padding: '0.575rem 0.875rem',
          background: 'rgba(245,158,11,.08)',
          border: '1px solid rgba(245,158,11,.2)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '0.875rem',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#d97706', width: '100%', marginBottom: '0.1rem' }}>
            📝 Weekly Exams
          </div>
          {s.mondayExamTopic && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.1rem' }}>Monday</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.mondayExamTopic}</div>
            </div>
          )}
          {s.fridayExamTopic && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.1rem' }}>Friday</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.fridayExamTopic}</div>
            </div>
          )}
        </div>
      )}

      {days.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {days.map((day) => {
            const entries = byDay[day]!
            const color   = DAY_COLOR[day]
            return (
              <div key={day}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color }} />
                  {DAY_LABELS[day]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem' }}>
                  {entries.map((e, i) => {
                    const badge = SESSION_BADGE[e.sessionType]
                    const isExam = e.sessionType === 'WEEKLY_EXAM' || e.sessionType === 'MONTHLY_EXAM'
                    const isMe   = getFacultyId(e.facultyId) === facultyId
                    return (
                      <div key={i} style={{
                        display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap',
                        padding: '0.45rem 0.7rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        background: isMe
                          ? 'linear-gradient(90deg,rgba(99,102,241,.12),rgba(99,102,241,.04))'
                          : 'var(--color-surface-2)',
                        border: isMe ? '1px solid rgba(99,102,241,.3)' : '1px solid transparent',
                      }}>
                        <span className={`badge ${badge.cls}`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                          {badge.icon} {SESSION_LABELS[e.sessionType]}
                        </span>
                        {isExam && e.examDate && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{fmt(e.examDate)}</span>
                        )}
                        {!isExam && e.sessionDate && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 500 }}>
                            📅 {new Date(e.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {!isExam && e.startTime && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            🕒 {e.startTime}
                          </span>
                        )}
                        <span style={{ fontWeight: 600 }}>{e.subject}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>— {e.chapter}</span>
                        {e.durationHours && (
                          <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', marginLeft: 'auto' }}>⏱ {e.durationHours}h</span>
                        )}
                        {!isExam && e.facultyId && (
                          <span style={{ fontSize: '0.75rem', color: isMe ? 'var(--color-primary)' : 'var(--color-muted)', fontWeight: isMe ? 700 : 400, flexShrink: 0 }}>
                            👤 {typeof e.facultyId === 'object' ? e.facultyId.name : 'Assigned'}
                            {isMe && ' (you)'}
                          </span>
                        )}
                        {e.notes && (
                          <span style={{ width: '100%', fontSize: '0.75rem', color: 'var(--color-muted)' }}>📌 {e.notes}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No class entries for this week.</div>
      )}
    </div>
  )
}
