import type { HoursSummaryResponse } from '@/services/salary.service'
import { Icon } from '@/components/ui/Icon'
import { MONTHS } from './types'
import s from '../Portal.module.css'

interface MonthlyHoursHistoryCardProps {
  loading: boolean
  hoursSummary: HoursSummaryResponse | null
}

export function MonthlyHoursHistoryCard({ loading, hoursSummary }: MonthlyHoursHistoryCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Monthly Class Hours</h2>
        <span className={s.sub}>Last 12 months</span>
      </div>

      {loading ? (
        <div className="flex justify-center" style={{ padding: 'var(--space-5)' }} role="status" aria-label="Loading">
          <span className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      ) : !hoursSummary || hoursSummary.months.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="calendar" size={22} /></div>
          <h3>No completed sessions yet</h3>
          <p>Your monthly hours will appear here once sessions are recorded</p>
        </div>
      ) : (
        <>
          <div className={s.summaryLine}>
            All time: <strong>{hoursSummary.allTimeTotalHours.toFixed(1)} hrs</strong> across {hoursSummary.allTimeSessionCount} session{hoursSummary.allTimeSessionCount === 1 ? '' : 's'}
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="num" style={{ textAlign: 'right' }}>Sessions</th>
                  <th className="num" style={{ textAlign: 'right' }}>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {hoursSummary.months.map((row) => (
                  <tr key={`${row.year}-${row.month}`}>
                    <td className={s.strong}>{MONTHS[row.month - 1]} {row.year}</td>
                    <td className={`num ${s.right}`}>{row.sessionCount}</td>
                    <td className={`num ${s.hoursStrong}`}>{row.totalHours.toFixed(1)} hrs</td>
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
