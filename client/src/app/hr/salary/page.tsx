'use client'
import { useEffect, useRef, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/faculty.service'
import { calculate, calculateRange, approve, approveRange, setPayableDays } from '@/services/salary.service'
import type { Faculty, SalaryResult } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { MONTHS, printSalarySlip, SalaryControls, SalaryResultCard } from '@/components/hr/salary'
import { toLocalISO } from '@/utils/date'

/** "01 Oct 2026" from a YYYY-MM-DD string. */
function fmtISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SalaryPage() {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const toast = useToast()

  const [faculty, setFaculty]       = useState<Faculty[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [month, setMonth]           = useState(new Date().getMonth() + 1)
  const [year, setYear]             = useState(new Date().getFullYear())
  const [from, setFrom]             = useState(() => {
    const now = new Date()
    return toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [to, setTo]                 = useState(() => toLocalISO(new Date()))
  const [result, setResult]         = useState<SalaryResult | null>(null)
  const [loading, setLoading]       = useState(false)
  const [approving, setApproving]   = useState(false)
  const [error, setError]           = useState('')
  const [approved, setApproved]     = useState(false)
  const [savingPayableDays, setSavingPayableDays] = useState(false)

  /**
   * The exact selection a displayed `result` was computed for. Approval and the
   * result card read from this snapshot, never from the live controls, so a
   * calculation can never be approved against a selection the user has since
   * changed. `calcSeq` invalidates responses from superseded requests.
   */
  const [resultCtx, setResultCtx] = useState<
    { facultyId: string; mode: 'MONTH' | 'RANGE'; month: number; year: number; from: string; to: string } | null
  >(null)
  const calcSeq = useRef(0)

  useEffect(() => {
    if (accessToken) getAll(accessToken, false).then((list) => {
      setFaculty(list)
      if (list.length > 0) setSelectedId(list[0]._id)
    }).catch(console.error)
  }, [accessToken])

  const selectedFaculty = faculty.find((f) => f._id === selectedId)
  const isTemp = selectedFaculty?.type === 'TEMPORARY'
  const mode: 'MONTH' | 'RANGE' = isTemp ? 'RANGE' : 'MONTH'
  const periodLabel = mode === 'RANGE'
    ? `${fmtISO(from)} – ${fmtISO(to)}`
    : `${MONTHS[month - 1]} ${year}`

  const reset = () => { calcSeq.current++; setResult(null); setResultCtx(null); setApproved(false); setLoading(false) }

  async function handleCalculate() {
    if (!accessToken || !selectedId) return
    const seq = ++calcSeq.current
    const ctx = { facultyId: selectedId, mode, month, year, from, to }
    setLoading(true); setError(''); setResult(null); setResultCtx(null); setApproved(false)
    try {
      const res = ctx.mode === 'RANGE'
        ? await calculateRange(ctx.facultyId, ctx.from, ctx.to, accessToken)
        : await calculate(ctx.facultyId, ctx.month, ctx.year, accessToken)
      if (seq !== calcSeq.current) return   // selection changed while in flight — drop it
      setResult(res)
      setResultCtx(ctx)
    } catch (e: unknown) {
      if (seq !== calcSeq.current) return
      setError(e instanceof Error ? e.message : 'Calculation failed')
    } finally {
      if (seq === calcSeq.current) setLoading(false)
    }
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
    if (!accessToken || !result || !resultCtx) return
    const ctx = resultCtx
    const ctxFacultyName = faculty.find((f) => f._id === ctx.facultyId)?.name ?? 'Faculty'
    setApproving(true); setError('')
    try {
      if (ctx.mode === 'RANGE') {
        await approveRange(ctx.facultyId, ctx.from, ctx.to, accessToken)
      } else {
        await approve(ctx.facultyId, ctx.month, ctx.year, accessToken)
      }
      toast.success('Salary approved', `${ctxFacultyName} salary for ${periodLabel} has been recorded.`)
      setApproved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Approval failed')
    } finally { setApproving(false) }
  }

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
        onSelectFaculty={(id) => { setSelectedId(id); reset() }}
        mode={mode}
        month={month}
        onMonthChange={(m) => { setMonth(m); reset() }}
        year={year}
        onYearChange={(y) => { setYear(y); reset() }}
        from={from}
        to={to}
        onFromChange={(v) => { setFrom(v); reset() }}
        onToChange={(v) => { setTo(v); reset() }}
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
          periodLabel={periodLabel}
          approved={approved}
          approving={approving}
          canApprove={canApprove}
          onApprove={handleApprove}
          onPrint={() => selectedFaculty && printSalarySlip(selectedFaculty, month, year, result, setError, periodLabel)}
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
