'use client'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getDashboard } from '@/services/salary.service'
import type { DashboardData } from '@/services/salary.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert } from '@/components/ui/Skeleton'
import {
  MONTHS,
  MonthYearSelector, TopStats, PenaltyOvertimeRow, HoursProgressCard,
  PayrollStatusCard, CancellationLogCard, QuickLinks,
} from '@/components/hr/dashboard'

interface PeriodData {
  month: number
  year: number
  data: DashboardData
}

export default function HRDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear]   = useState(new Date().getFullYear())

  // The response is tagged with the period it was requested for, so a slow or
  // out-of-order reply for a previous month can never be shown as the current
  // selection's numbers. useAsyncResource additionally drops superseded
  // responses (only the newest request may commit).
  const res = useAsyncResource<PeriodData>(
    async () => ({ month, year, data: await getDashboard(month, year, accessToken!) }),
    [accessToken, month, year],
    { enabled: !!accessToken },
  )

  // Only treat the payload as "this period's data" when the tag matches.
  const fresh = res.data && res.data.month === month && res.data.year === year
    ? res.data.data
    : null
  const periodLabel = `${MONTHS[month - 1]} ${year}`
  const loading = res.status === 'loading' || res.isRefetching || (!fresh && res.status !== 'error')

  return (
    <div>
      <MonthYearSelector
        month={month}
        onMonthChange={setMonth}
        year={year}
        onYearChange={setYear}
        loading={loading}
        onRefresh={res.refetch}
      />

      {res.status === 'error' && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorAlert
            message={res.error?.message ?? ''}
            what={`Couldn't load the ${periodLabel} dashboard`}
            onRetry={res.refetch}
          />
        </div>
      )}

      <TopStats totals={fresh?.totals} />

      <PenaltyOvertimeRow totals={fresh?.totals} month={month} year={year} />

      <HoursProgressCard hoursProgress={fresh?.hoursProgress ?? []} />

      <div className="panel-grid-2">
        <PayrollStatusCard loading={loading} hasData={!!fresh} payrollStatus={fresh?.payrollStatus ?? []} />
        <CancellationLogCard cancellationLog={fresh?.cancellationLog ?? []} month={month} year={year} />
      </div>

      <QuickLinks />
    </div>
  )
}
