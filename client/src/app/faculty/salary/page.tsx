'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { calculate, getMyHoursSummary } from '@/services/salary.service'
import type { HoursSummaryResponse } from '@/services/salary.service'
import type { SalaryResult } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { SalaryCheckForm, SalaryResultCard, MonthlyHoursHistoryCard } from '@/components/faculty/salary'

export default function FacultySalaryPage() {
  const { accessToken, facultyId } = useAppSelector((s) => s.auth)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year,  setYear]  = useState(new Date().getFullYear())
  const [result,  setResult]  = useState<SalaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [hoursSummary, setHoursSummary]         = useState<HoursSummaryResponse | null>(null)
  const [hoursLoading, setHoursLoading]         = useState(true)

  useEffect(() => {
    if (!accessToken) return
    setHoursLoading(true)
    getMyHoursSummary(accessToken)
      .then(setHoursSummary)
      .catch(console.error)
      .finally(() => setHoursLoading(false))
  }, [accessToken])

  async function handleCalculate() {
    if (!accessToken || !facultyId) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await calculate(facultyId, month, year, accessToken)
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <SalaryCheckForm
        month={month}
        onMonthChange={setMonth}
        year={year}
        onYearChange={setYear}
        loading={loading}
        onCheck={handleCalculate}
      />

      {error && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorAlert message={error} what="Salary calculation failed" onRetry={handleCalculate} />
        </div>
      )}

      {result && (
        <SalaryResultCard result={result} month={month} year={year} hoursSummary={hoursSummary} />
      )}

      {!result && !loading && !error && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="empty-state">
            <div className="empty-state-icon">₹</div>
            <h3>Select month and click Check Salary</h3>
            <p>Your salary estimate will appear here based on logged sessions</p>
          </div>
        </div>
      )}

      <MonthlyHoursHistoryCard loading={hoursLoading} hoursSummary={hoursSummary} />
    </div>
  )
}
