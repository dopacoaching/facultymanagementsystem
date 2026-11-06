import type { Session } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { STATUS_BADGE } from './types'
import s from '../Portal.module.css'

export type SessionFilterKey = 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

interface SessionLogTableProps {
  sessions: Session[]
  filtered: Session[]
  filter: SessionFilterKey
  onFilterChange: (key: SessionFilterKey) => void
}

export function SessionLogTable({ sessions, filtered, filter, onFilterChange }: SessionLogTableProps) {
  const filterOptions: { key: SessionFilterKey; label: string }[] = [
    { key: 'ALL',       label: `All (${sessions.length})` },
    { key: 'SCHEDULED', label: `Upcoming (${sessions.filter((x) => x.status === 'SCHEDULED').length})` },
    { key: 'COMPLETED', label: `Completed (${sessions.filter((x) => x.status === 'COMPLETED').length})` },
    { key: 'CANCELLED', label: `Cancelled (${sessions.filter((x) => x.status === 'CANCELLED').length})` },
  ]

  return (
    <div className="stack-sm">
      <div className={s.filters}>
        <div className="segmented" role="group" aria-label="Filter sessions by status">
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => onFilterChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {filtered.length === 0 ? (
          <EmptyState
            title="No sessions found"
            description={filter === 'ALL' ? 'No sessions recorded yet. Sessions will appear here once logged.' : `No ${filter.toLowerCase().replace('_', ' ')} sessions. Try changing the filter.`}
          />
        ) : (
          <div className="table-wrapper table-stack">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sess) => (
                  <tr key={sess._id}>
                    <td data-label="Subject" className={s.strong}>{sess.subject}</td>
                    <td data-label="Chapter" className={s.muted}>{sess.chapter}</td>
                    <td data-label="Date" className={`${s.muted} ${s.nowrap}`}>
                      {new Date(sess.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td data-label="Duration" className="num">{sess.durationHours}h</td>
                    <td data-label="Status">
                      <span className={`badge badge-dot ${STATUS_BADGE[sess.status] ?? 'badge-gray'}`}>
                        {sess.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
