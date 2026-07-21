import Link from 'next/link'
import { fmtDate, Schedule } from './types'

interface ScheduleStatusCardProps {
  schedules: Schedule[]
  unpublishedSchedules: Schedule[]
  recentPublished: Schedule[]
  getBatchName: (b: string | { _id: string; name: string }) => string
}

export function ScheduleStatusCard({ schedules, unpublishedSchedules, recentPublished, getBatchName }: ScheduleStatusCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>🗓 Schedules</h2>
        <Link href="/academics/schedule" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Manage →
        </Link>
      </div>
      {unpublishedSchedules.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
            Unpublished Drafts
          </div>
          {unpublishedSchedules.slice(0, 3).map((s) => (
            <div key={s._id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 500 }}>{getBatchName(s.batchId)}</span>
              <span style={{ color: 'var(--color-muted)', marginLeft: '0.5rem' }}>week of {fmtDate(s.weekStartDate)}</span>
            </div>
          ))}
        </div>
      )}
      {recentPublished.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
            Recently Published
          </div>
          {recentPublished.map((s) => (
            <div key={s._id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,.06)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 500 }}>{getBatchName(s.batchId)}</span>
              <span style={{ color: 'var(--color-muted)', marginLeft: '0.5rem' }}>week of {fmtDate(s.weekStartDate)}</span>
            </div>
          ))}
        </div>
      )}
      {schedules.length === 0 && (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>No schedules created yet.</p>
      )}
    </div>
  )
}
