import Link from 'next/link'
import type { HoursSummaryResponse } from '@/services/salary.service'
import { SALARY_ENABLED } from '@/lib/constants/features'
import { Icon } from '@/components/ui/Icon'
import { MONTHS } from './types'
import s from '../Portal.module.css'

interface MonthlyHoursCardProps {
  hoursSummary: HoursSummaryResponse
}

export function MonthlyHoursCard({ hoursSummary }: MonthlyHoursCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Monthly Class Hours</h2>
        {SALARY_ENABLED && (
          <Link href="/faculty/salary" className={s.sectionLink}>
            Full history <Icon name="chevronRight" size={12} />
          </Link>
        )}
      </div>
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
            {hoursSummary.months.slice(0, 6).map((row) => (
              <tr key={`${row.year}-${row.month}`}>
                <td className={s.strong}>{MONTHS[row.month - 1]} {row.year}</td>
                <td className={`num ${s.right}`}>{row.sessionCount}</td>
                <td className={`num ${s.hoursStrong}`}>{row.totalHours.toFixed(1)} hrs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
