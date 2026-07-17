import Link from 'next/link'
import { EmptyState } from '@/components/ui/Skeleton'
import { ISession, STATUS_BADGE } from './types'

interface RecentIGSessionsCardProps {
  sessions: ISession[]
}

export function RecentIGSessionsCard({ sessions }: RecentIGSessionsCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Recent IG Sessions</h2>
        <Link href="/ig/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          View all →
        </Link>
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="No IG sessions yet"
          description="IG sessions will appear here once they are logged."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {sessions.slice(0, 6).map((s) => (
            <div key={s._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.575rem 0.5rem', borderRadius: '0.5rem', transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.subject}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                  {' · '}
                  {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </div>
              </div>
              <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`}>
                {s.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
