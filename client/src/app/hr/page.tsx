'use client'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getDashboard } from '@/services/salary.service'
import type { DashboardData } from '@/services/salary.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { toLocalISO } from '@/utils/date'
import {
  TopStats, PenaltyOvertimeRow, HoursProgressCard,
  PayrollStatusCard, CancellationLogCard, QuickLinks,
} from '@/components/hr/dashboard'

interface RangeData {
  from: string
  to: string
  data: DashboardData
}

function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function HRDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const now = new Date()
  const [from, setFrom] = useState(toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo]     = useState(toLocalISO(now))

  // The response is tagged with the range it was requested for, so a slow or
  // out-of-order reply for a previous range can never be shown as the current
  // selection's numbers. useAsyncResource additionally drops superseded
  // responses (only the newest request may commit).
  const res = useAsyncResource<RangeData>(
    async () => ({ from, to, data: await getDashboard(from, to, accessToken!) }),
    [accessToken, from, to],
    { enabled: !!accessToken && !!from && !!to },
  )

  // Only treat the payload as "this range's data" when the tag matches.
  const fresh = res.data && res.data.from === from && res.data.to === to
    ? res.data.data
    : null
  const periodLabel = from === to ? fmtDay(from) : `${fmtDay(from)} – ${fmtDay(to)}`
  const loading = res.status === 'loading' || res.isRefetching || (!fresh && res.status !== 'error')

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          loading={loading}
          onApply={res.refetch}
          applyLabel="Refresh"
        />
      </div>

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

      <PenaltyOvertimeRow totals={fresh?.totals} periodLabel={periodLabel} />

      <HoursProgressCard hoursProgress={fresh?.hoursProgress ?? []} />

      <div className="panel-grid-2">
        <PayrollStatusCard loading={loading} hasData={!!fresh} payrollStatus={fresh?.payrollStatus ?? []} />
        <CancellationLogCard cancellationLog={fresh?.cancellationLog ?? []} periodLabel={periodLabel} />
      </div>

      <QuickLinks />
    </div>
  )
}
