'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/faculty.service'
import { calculate, approve, setPayableDays } from '@/services/salary.service'
import type { Faculty, SalaryResult } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { MONTHS, printSalarySlip, SalaryControls, SalaryResultCard } from '@/components/hr/salary'

export default function SalaryPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const [faculty, setFaculty]       = useState<Faculty[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [month, setMonth]           = useState(new Date().getMonth() + 1)
  const [year, setYear]             = useState(new Date().getFullYear())
  const [result, setResult]         = useState<SalaryResult | null>(null)
  const [loading, setLoading]       = useState(false)
  const [approving, setApproving]   = useState(false)
  const [error, setError]           = useState('')
  const [approved, setApproved]     = useState(false)
  const [savingPayableDays, setSavingPayableDays] = useState(false)

  useEffect(() => {
    if (accessToken) getAll(accessToken, false).then((list) => {
      setFaculty(list)
      if (list.length > 0) setSelectedId(list[0]._id)
    }).catch(console.error)
  }, [accessToken])

  async function handleCalculate() {
    if (!accessToken || !selectedId) return
    setLoading(true); setError(''); setResult(null); setApproved(false)
    try {
      const res = await calculate(selectedId, month, year, accessToken)
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Calculation failed')
    } finally { setLoading(false) }
  }

  async function handleSavePayableDays(payableDays: number) {
    if (!accessToken || !selectedId) return
    setSavingPayableDays(true); setError('')
    try {
      await setPayableDays(selectedId, month, year, payableDays, accessToken)
      await handleCalculate()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save Payable Days')
    } finally { setSavingPayableDays(false) }
  }

  async function handleApprove() {
    if (!accessToken || !selectedId || !result) return
    setApproving(true); setError('')
    try {
      await approve(selectedId, month, year, accessToken)
      toast.success('Salary approved', `${selectedFaculty?.name ?? 'Faculty'} salary for ${MONTHS[month - 1]} ${year} has been recorded.`)
      setApproved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Approval failed')
    } finally { setApproving(false) }
  }

  const selectedFaculty = faculty.find((f) => f._id === selectedId)
  const canApprove = result?.status === 'OK' || result?.status === 'HR_REVIEW'

  // Only HR_MANAGER and ADMIN may access salary data.
  // The layout/shell should enforce this too, but guard here as a fallback.
  // (Placed after all hooks so the hook order stays stable across renders.)
  if (role && !['HR_MANAGER', 'ADMIN'].includes(role)) {
    return <div className="alert alert-error" style={{ margin: '2rem' }}>Access denied — HR Manager or Admin only.</div>
  }

  return (
    <div>
      <SalaryControls
        faculty={faculty}
        selectedId={selectedId}
        onSelectFaculty={(id) => { setSelectedId(id); setResult(null); setApproved(false) }}
        month={month}
        onMonthChange={(m) => { setMonth(m); setResult(null); setApproved(false) }}
        year={year}
        onYearChange={(y) => { setYear(y); setResult(null); setApproved(false) }}
        loading={loading}
        onCalculate={handleCalculate}
      />

      {error && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorAlert message={error} what="Salary calculation failed" onRetry={handleCalculate} />
        </div>
      )}

      {result && (
        <SalaryResultCard
          result={result}
          selectedFaculty={selectedFaculty}
          month={month}
          year={year}
          approved={approved}
          approving={approving}
          canApprove={canApprove}
          onApprove={handleApprove}
          onPrint={() => selectedFaculty && printSalarySlip(selectedFaculty, month, year, result, setError)}
          savingPayableDays={savingPayableDays}
          onSavePayableDays={handleSavePayableDays}
        />
      )}

      {!result && !loading && !error && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">₹</div>
            <h3>Select faculty and click Calculate</h3>
            <p>The salary calculator will apply contract rules and show the detailed breakdown</p>
          </div>
        </div>
      )}
    </div>
  )
}
