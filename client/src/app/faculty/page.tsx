'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getSessions } from '@/services/session.service'
import { getById as getFacultyById } from '@/services/faculty.service'
import { calculate, getMyHoursSummary } from '@/services/salary.service'
import type { HoursSummaryResponse } from '@/services/salary.service'
import type { Session, Faculty, SalaryResult } from '@/types'
import { SALARY_ENABLED } from '@/lib/constants/features'
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
      getSessions({ facultyId, limit: 50 } as Parameters<typeof getSessions>[0], accessToken).catch(() => [] as Session[]),
      // Salary is on hold: skip the calculation entirely (the API would answer 503).
      SALARY_ENABLED ? calculate(facultyId, month, year, accessToken).catch(() => null) : Promise.resolve(null),
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

  // Month figures come from the server-aggregated summary (all COMPLETED
  // sessions); the capped session list is only a fallback and the recent list.
  const thisMonthRow = hoursSummary?.months.find((m) => m.month === month && m.year === year)
  const completedFallback = sessions.filter((s) => {
    const d = new Date(s.sessionDate)
    return s.status === 'COMPLETED' && d.getMonth() + 1 === month && d.getFullYear() === year
  })
  const completedCount = thisMonthRow?.sessionCount ?? completedFallback.length
  const totalHours = salary?.hoursLogged
    ?? thisMonthRow?.totalHours
    ?? completedFallback.reduce((sum, s) => sum + s.durationHours, 0)
  const allTimeHours = hoursSummary?.allTimeTotalHours
  const lastEntry = sessions.find((s) => s.status === 'COMPLETED')?.sessionDate

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
        completedCount={completedCount}
        totalHours={totalHours}
        allTimeHours={allTimeHours}
        lastEntry={lastEntry}
        salary={salary}
      />

      {SALARY_ENABLED && salary && (salary.status === 'OK' || salary.status === 'HR_REVIEW') && (
        <SalarySnapshotCard salary={salary} month={month} year={year} />
      )}

      {hoursSummary && hoursSummary.months.length > 0 && (
        <MonthlyHoursCard hoursSummary={hoursSummary} />
      )}

      <RecentSessionsCard sessions={sessions} />
    </div>
  )
}
