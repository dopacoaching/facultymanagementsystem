'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getSessions } from '@/services/session.service'
import { getById as getFacultyById } from '@/services/faculty.service'
import { calculate, getMyHoursSummary } from '@/services/salary.service'
import type { HoursSummaryResponse } from '@/services/salary.service'
import type { Session } from '@/types'
import type { Faculty } from '@/types'
import type { SalaryResult } from '@/types'
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton'
import {
  WelcomeBanner, DashboardStats, SalarySnapshotCard, MonthlyHoursCard, RecentSessionsCard,
} from '@/components/faculty/dashboard'

export default function FacultyDashboard() {
  const { accessToken, facultyId } = useAppSelector((s) => s.auth)

  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  const [faculty,       setFaculty]       = useState<Faculty | null>(null)
  const [sessions,      setSessions]      = useState<Session[]>([])
  const [salary,        setSalary]        = useState<SalaryResult | null>(null)
  const [hoursSummary,  setHoursSummary]  = useState<HoursSummaryResponse | null>(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    if (!accessToken || !facultyId) return

    setLoading(true)
    Promise.all([
      getFacultyById(facultyId, accessToken).catch(() => null),
      // Fetch enough sessions to cover this month's display + upcoming list.
      // limit:50 is generous; total hours are derived from the salary calculation
      // below (which aggregates all COMPLETED sessions server-side) rather than
      // from this capped list.
      getSessions({ facultyId, limit: 50 } as Parameters<typeof getSessions>[0], accessToken).catch(() => [] as Session[]),
      calculate(facultyId, month, year, accessToken).catch(() => null),
      getMyHoursSummary(accessToken).catch(() => null),
    ])
      .then(([fac, sess, sal, hrs]) => {
        setFaculty(fac)
        setSessions(sess as Session[])
        setSalary(sal)
        setHoursSummary(hrs)
      })
      .finally(() => setLoading(false))
  }, [accessToken, facultyId]) // eslint-disable-line

  const thisMonthSessions = sessions.filter((s) => {
    const d = new Date(s.sessionDate)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })
  const completed   = thisMonthSessions.filter((s) => s.status === 'COMPLETED')
  const upcoming    = sessions.filter((s) => s.status === 'SCHEDULED')
  // Use server-aggregated hoursLogged from the salary calculation as the authoritative
  // hours total — it covers ALL sessions, not just the ones in the capped fetch above.
  const totalHours  = salary?.hoursLogged ?? completed.reduce((sum, s) => sum + s.durationHours, 0)
  const allTimeHours = hoursSummary?.allTimeTotalHours

  if (loading) {
    return (
      <div>
        <SkeletonStats count={4} />
        <div style={{ marginTop: '1.5rem' }}>
          <SkeletonCard lines={5} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <WelcomeBanner faculty={faculty} month={month} year={year} />

      <DashboardStats
        completedCount={completed.length}
        totalHours={totalHours}
        allTimeHours={allTimeHours}
        upcomingCount={upcoming.length}
        salary={salary}
      />

      {salary && (salary.status === 'OK' || salary.status === 'HR_REVIEW') && (
        <SalarySnapshotCard salary={salary} month={month} year={year} />
      )}

      {hoursSummary && hoursSummary.months.length > 0 && (
        <MonthlyHoursCard hoursSummary={hoursSummary} />
      )}

      <RecentSessionsCard sessions={sessions} />
    </div>
  )
}
