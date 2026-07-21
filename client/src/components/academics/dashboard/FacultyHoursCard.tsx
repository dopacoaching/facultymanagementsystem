import type { FacultyHoursItem } from '@/services/session.service'
import { Skeleton, EmptyState } from '@/components/ui/Skeleton'
import { HOURS_STATUS_BADGE, MONTHS } from './types'

interface FacultyHoursCardProps {
  facultyHours: FacultyHoursItem[]
  loading: boolean
  hoursMonth: number
  hoursYear: number
  onMonthChange: (m: number) => void
  onYearChange: (y: number) => void
}

export function FacultyHoursCard({ facultyHours, loading, hoursMonth, hoursYear, onMonthChange, onYearChange }: FacultyHoursCardProps) {
  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2>Faculty Hours</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input"
            value={hoursMonth}
            onChange={(e) => onMonthChange(+e.target.value)}
            style={{ minWidth: 90, padding: '0.3rem 0.5rem', fontSize: '0.8125rem' }}
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input
            type="number"
            className="input"
            value={hoursYear}
            onChange={(e) => onYearChange(+e.target.value)}
            style={{ width: 80, padding: '0.3rem 0.5rem', fontSize: '0.8125rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[100, 80, 95, 70, 85].map((w, i) => (
            <Skeleton key={i} height={32} style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : facultyHours.length === 0 ? (
        <EmptyState
          icon="⏱"
          title="No faculty hours for this month"
          description="Hours will appear here once sessions are logged for the selected month."
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Subject</th>
                <th>Contract</th>
                <th style={{ textAlign: 'right' }}>Logged</th>
                <th style={{ textAlign: 'right' }}>Quota</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {facultyHours.map((f) => (
                <tr key={String(f.facultyId)}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{f.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{f.subject}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {f.contractType.replace(/_/g, ' ')}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-primary)' }}>
                    {f.logged.toFixed(1)}h
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem' }}>
                    {f.quota != null ? `${f.quota}h` : '—'}
                  </td>
                  <td style={{ minWidth: 100 }}>
                    {f.quota != null && f.pct != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(f.pct, 100)}%`,
                            background: f.pct >= 100 ? 'var(--color-success)' : f.pct >= 70 ? 'var(--color-primary)' : f.pct >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
                            borderRadius: 3,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{f.pct}%</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${HOURS_STATUS_BADGE[f.status] ?? 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                      {f.status === 'NO_QUOTA' ? 'Hourly' : f.status.replace(/_/g, ' ')}
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
