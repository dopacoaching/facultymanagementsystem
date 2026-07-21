import type { Session } from '@/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { STATUS_BADGE } from './types'

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
    { key: 'SCHEDULED', label: `Upcoming (${sessions.filter((s) => s.status === 'SCHEDULED').length})` },
    { key: 'COMPLETED', label: `Completed (${sessions.filter((s) => s.status === 'COMPLETED').length})` },
    { key: 'CANCELLED', label: `Cancelled (${sessions.filter((s) => s.status === 'CANCELLED').length})` },
  ]

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {filterOptions.map(({ key, label }) => (
          <button
            key={key}
            className="btn btn-sm"
            style={{
              background:  filter === key ? 'var(--color-primary)' : 'transparent',
              color:       filter === key ? '#fff' : 'var(--color-text-secondary)',
              border:      `1.5px solid ${filter === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
              boxShadow:   filter === key ? '0 2px 8px rgba(79,70,229,.25)' : 'none',
            }}
            onClick={() => onFilterChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No sessions found"
          description={filter === 'ALL' ? 'No sessions recorded yet. Sessions will appear here once logged.' : `No ${filter.toLowerCase().replace('_', ' ')} sessions. Try changing the filter.`}
        />
      ) : (
        <div className="table-wrapper">
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
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>{s.subject}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{s.chapter}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                    {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.durationHours}h</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`}>
                      {s.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
