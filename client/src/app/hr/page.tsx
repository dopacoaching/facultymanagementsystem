'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getDashboard } from '@/services/salary.service'
import type { DashboardData } from '@/services/salary.service'
import {
  MonthYearSelector, TopStats, PenaltyOvertimeRow, HoursProgressCard,
  PayrollStatusCard, CancellationLogCard, QuickLinks,
} from '@/components/hr/dashboard'

export default function HRDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear]   = useState(new Date().getFullYear())
  const [data, setData]   = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      setData(await getDashboard(month, year, accessToken))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [accessToken, month, year])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <MonthYearSelector
        month={month}
        onMonthChange={setMonth}
        year={year}
        onYearChange={setYear}
        loading={loading}
        onRefresh={load}
      />

      <TopStats totals={data?.totals} />

      <PenaltyOvertimeRow totals={data?.totals} month={month} year={year} />

      <HoursProgressCard hoursProgress={data?.hoursProgress ?? []} />

      <div className="panel-grid-2">
        <PayrollStatusCard loading={loading} hasData={!!data} payrollStatus={data?.payrollStatus ?? []} />
        <CancellationLogCard cancellationLog={data?.cancellationLog ?? []} month={month} year={year} />
      </div>

      <QuickLinks />
    </div>
  )
}
