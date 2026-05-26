'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/faculty.service'
import { calculate, approve } from '@/services/salary.service'
import type { Faculty, SalaryResult, SalaryAlert } from '@/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function alertClass(level: SalaryAlert['level']): string {
  if (level === 'BLOCK')   return 'alert alert-error'
  if (level === 'WARNING') return 'alert alert-warning'
  return 'alert alert-info'
}

function alertIcon(level: SalaryAlert['level']): string {
  if (level === 'BLOCK')   return '🚫'
  if (level === 'WARNING') return '⚠️'
  return '💡'
}

function statusBadge(status: SalaryResult['status']): string {
  if (status === 'OK')             return 'badge-green'
  if (status === 'HR_REVIEW')      return 'badge-yellow'
  if (status === 'PENDING_CONFIG') return 'badge-yellow'
  return 'badge-red'
}

export default function SalaryPage() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [faculty, setFaculty]       = useState<Faculty[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [month, setMonth]           = useState(new Date().getMonth() + 1)
  const [year, setYear]             = useState(new Date().getFullYear())
  const [result, setResult]         = useState<SalaryResult | null>(null)
  const [loading, setLoading]       = useState(false)
  const [approving, setApproving]   = useState(false)
  const [error, setError]           = useState('')
  const [approved, setApproved]     = useState(false)

  useEffect(() => {
    if (accessToken) getAll(accessToken, true).then((list) => {
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

  async function handleApprove() {
    if (!accessToken || !selectedId || !result) return
    setApproving(true); setError('')
    try {
      await approve(selectedId, month, year, accessToken)
      setApproved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Approval failed')
    } finally { setApproving(false) }
  }

  const selectedFaculty = faculty.find((f) => f._id === selectedId)
  const canApprove = result?.status === 'OK' || result?.status === 'HR_REVIEW'

  return (
    <div>
      {/* ── Controls ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 200px', minWidth: 200 }}>
            <label className="label">Faculty</label>
            <select className="input" value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setResult(null); setApproved(false) }}>
              {faculty.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Month</label>
            <select className="input" value={month} onChange={(e) => setMonth(+e.target.value)} style={{ minWidth: 100 }}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Year</label>
            <input type="number" className="input" value={year} onChange={(e) => setYear(+e.target.value)} style={{ width: 100 }} />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleCalculate}
            disabled={loading || !selectedId}
            style={{ alignSelf: 'flex-end' }}
          >
            {loading ? (
              <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Calculating…</>
            ) : '⚡ Calculate'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <span className="alert-icon">⚠</span>
          <div>{error}</div>
        </div>
      )}

      {/* ── Result card ── */}
      {result && (
        <div className="card">
          {/* Header row */}
          <div className="card-header">
            <div>
              <h2 style={{ margin: 0 }}>{selectedFaculty?.name}</h2>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                {MONTHS[month - 1]} {year} · {selectedFaculty?.subject}
              </div>
            </div>
            <span className={`badge ${statusBadge(result.status)}`} style={{ fontSize: '0.8rem' }}>
              {result.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Blocked / pending config banner */}
          {(result.status === 'BLOCKED' || result.status === 'PENDING_CONFIG') && result.reason && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <span className="alert-icon">🚫</span>
              <div>
                <strong>Payroll Blocked</strong>
                <div style={{ marginTop: '0.2rem', fontWeight: 400 }}>{result.reason}</div>
              </div>
            </div>
          )}

          {/* ── Alerts ── */}
          {result.alerts && result.alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <p className="section-label">Payroll Alerts</p>
              {result.alerts.map((alert, i) => (
                <div key={i} className={alertClass(alert.level)}>
                  <span className="alert-icon">{alertIcon(alert.level)}</span>
                  <div>
                    <strong>[{alert.code}]</strong> {alert.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Carry-forward (Ashraf AC) ── */}
          {result.carryForward && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="section-label">Hour Carry-Forward</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {[
                  { label: 'Prev Month Balance',  value: `${result.carryForward.previousMonthBalance.toFixed(1)} hrs`, bg: '#fff7ed', border: '#fed7aa', color: '#b45309' },
                  { label: 'This Month Balance',  value: `${result.carryForward.currentMonthBalance.toFixed(1)} hrs`,  bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
                  { label: 'Combined Total',       value: `${result.carryForward.combinedTotal.toFixed(1)} hrs`,        bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
                ].map(({ label, value, bg, border, color }) => (
                  <div key={label} style={{
                    padding: '0.875rem 1rem',
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 'var(--radius)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.125rem', color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Pay breakdown ── */}
          {result.breakdown && result.breakdown.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="section-label">Pay Breakdown</p>
              <div className="table-wrapper">
                <table>
                  <tbody>
                    {result.breakdown.map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: row.isDeduction ? 'var(--color-danger)' : 'var(--color-text)' }}>
                          {row.isDeduction ? '− ' : ''}{row.label}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: row.isDeduction ? 'var(--color-danger)' : 'var(--color-text)' }}>
                          {Number.isInteger(row.amount) || row.amount > 100
                            ? `₹${row.amount.toLocaleString('en-IN')}`
                            : row.amount.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Summary metrics & approve ── */}
          {(result.status === 'OK' || result.status === 'HR_REVIEW') && (
            <>
              <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                {([
                  ['Hours Logged',  result.hoursLogged   != null ? `${result.hoursLogged} hrs` : null,  '⏱', 'var(--color-primary)'],
                  ['Days Worked',   result.daysWorked    != null ? `${result.daysWorked} days` : null,   '📅', 'var(--color-accent)'],
                  ['Leaves Taken',  result.leavesTaken   != null && result.leavesTaken > 0 ? `${result.leavesTaken} days` : null, '🌴', 'var(--color-warning)'],
                  ['Base Salary',   result.baseSalary    != null ? `₹${result.baseSalary.toLocaleString('en-IN')}` : null, '💰', 'var(--color-success)'],
                  ['Overtime',      result.overtimePay   != null && result.overtimePay > 0 ? `₹${result.overtimePay.toLocaleString('en-IN')}` : null, '⚡', 'var(--color-info)'],
                  ['Penalties',     result.penalties     != null && result.penalties    > 0 ? `₹${result.penalties.toLocaleString('en-IN')}` : null, '❌', 'var(--color-danger)'],
                ] as [string, string | null, string, string][]).filter(([, v]) => v != null).map(([label, value, icon]) => (
                  <div key={String(label)} className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="stat-label">{label}</div>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-text)', marginTop: '0.25rem' }}>{value}</div>
                      </div>
                      <span style={{ fontSize: '1.25rem', opacity: 0.7 }}>{icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final payable banner */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem 1.5rem',
                background: result.status === 'HR_REVIEW'
                  ? 'linear-gradient(135deg, #92400e, #b45309)'
                  : 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
                color: '#fff',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.25rem',
                boxShadow: result.status === 'HR_REVIEW'
                  ? '0 4px 16px rgba(180,83,9,.3)'
                  : '0 4px 16px rgba(79,70,229,.3)',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', opacity: 0.9 }}>Final Payable</div>
                  {result.status === 'HR_REVIEW' && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.2rem' }}>
                      ⚠️ Pending HR review — approve with caution
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
                    ₹{result.finalPayable?.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.2rem' }}>
                    {MONTHS[month - 1]} {year}
                  </div>
                </div>
              </div>

              {/* Approve button */}
              {approved ? (
                <div className="alert alert-success">
                  <span className="alert-icon">✅</span>
                  Salary approved and recorded for {MONTHS[month - 1]} {year}.
                </div>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={handleApprove}
                  disabled={approving || !canApprove}
                  style={{ width: '100%' }}
                >
                  {approving ? (
                    <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Approving…</>
                  ) : '✓ Approve & Record Salary'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Empty state */}
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
