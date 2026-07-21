import Link from 'next/link'
import { EmptyState } from '@/components/ui/Skeleton'
import { STATUS_BADGE } from './types'
import type { DailySlot } from './types'

interface TodayScheduleCardProps {
  todaySlots: DailySlot[]
}

function getBatchName(bid: DailySlot['batchId']): string {
  return typeof bid === 'object' ? bid.name : String(bid).slice(-6)
}

export function TodayScheduleCard({ todaySlots }: TodayScheduleCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Today&apos;s Schedule</h2>
        <Link href="/ig/timetable" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Manage →
        </Link>
      </div>
      {todaySlots.length === 0 ? (
        <EmptyState
          icon="⏱"
          title="No classes scheduled today"
          description="Assign classes in the IG Timetable to see today's schedule here."
          action={{ label: 'Manage Timetable', onClick: () => window.location.href = '/ig/timetable' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {todaySlots.map((slot) => (
            <div key={slot._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.625rem 0.5rem', borderRadius: '0.5rem', transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{getBatchName(slot.batchId)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  {slot.subject} · {slot.timeSlot}
                  {typeof slot.facultyId === 'object' && slot.facultyId?.name
                    ? ` · ${slot.facultyId.name}` : ''}
                </div>
              </div>
              <span className={`badge ${STATUS_BADGE[slot.status] ?? 'badge-gray'}`}>
                {slot.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
