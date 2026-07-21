import type { HoursSummaryResponse } from '@/services/salary.service'
import { MONTHS } from './types'

interface MonthlyHoursHistoryCardProps {
  loading: boolean
  hoursSummary: HoursSummaryResponse | null
}

export function MonthlyHoursHistoryCard({ loading, hoursSummary }: MonthlyHoursHistoryCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Monthly Class Hours</h2>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>Last 12 months</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <span className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      ) : !hoursSummary || hoursSummary.months.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <div className="empty-state-icon">📅</div>
          <h3>No completed sessions yet</h3>
          <p>Your monthly hours will appear here once sessions are recorded</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
            All time: <strong style={{ color: 'var(--color-text)' }}>{hoursSummary.allTimeTotalHours.toFixed(1)} hrs</strong> across {hoursSummary.allTimeSessionCount} session{hoursSummary.allTimeSessionCount === 1 ? '' : 's'}
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Sessions</th>
                  <th style={{ textAlign: 'right' }}>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {hoursSummary.months.map((row) => (
                  <tr key={`${row.year}-${row.month}`}>
                    <td style={{ fontWeight: 600 }}>{MONTHS[row.month - 1]} {row.year}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.sessionCount}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.totalHours.toFixed(1)} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
