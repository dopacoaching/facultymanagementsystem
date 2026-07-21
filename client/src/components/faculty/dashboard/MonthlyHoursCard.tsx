import Link from 'next/link'
import type { HoursSummaryResponse } from '@/services/salary.service'
import { MONTHS } from './types'

interface MonthlyHoursCardProps {
  hoursSummary: HoursSummaryResponse
}

export function MonthlyHoursCard({ hoursSummary }: MonthlyHoursCardProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h2>Monthly Class Hours</h2>
        <Link href="/faculty/salary" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Full history →
        </Link>
      </div>
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
            {hoursSummary.months.slice(0, 6).map((row) => (
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
    </div>
  )
}
