'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { calculate, getMyHoursSummary } from '@/services/salary.service'
import type { MonthlyHoursSummary } from '@/services/salary.service'
import type { SalaryResult } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function FacultySalaryPage() {
  const { accessToken, facultyId } = useAppSelector((s) => s.auth)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year,  setYear]  = useState(new Date().getFullYear())
  const [result,  setResult]  = useState<SalaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [hoursSummary, setHoursSummary]         = useState<MonthlyHoursSummary[]>([])
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
      {/* ── Salary check ────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
            disabled={loading}
            style={{ alignSelf: 'flex-end' }}
          >
            {loading ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Checking…</> : '⚡ Check Salary'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorAlert message={error} what="Salary calculation failed" onRetry={handleCalculate} />
        </div>
      )}

      {result && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>{MONTHS[month - 1]} {year}</h2>
            <span className={`badge ${result.status === 'OK' ? 'badge-green' : result.status === 'HR_REVIEW' ? 'badge-yellow' : 'badge-red'}`}>
              {result.status.replace(/_/g, ' ')}
            </span>
          </div>

          {result.status === 'BLOCKED' && result.reason && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <span className="alert-icon">🚫</span>
              <div>{result.reason}</div>
            </div>
          )}

          {result.status === 'PENDING_CONFIG' && (
            <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
              <span className="alert-icon">⚙</span>
              <div>Your pay contract is being configured by HR. Please check back later.</div>
            </div>
          )}

          {(result.status === 'OK' || result.status === 'HR_REVIEW') && (
            <>
              <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                {result.hoursLogged != null && (
                  <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="stat-label">Hours This Month</div>
                        <div style={{ fontWeight: 700, fontSize: '1.375rem', marginTop: '0.25rem', color: 'var(--color-primary)' }}>
                          {result.hoursLogged} hrs
                        </div>
                      </div>
                      <span style={{ fontSize: '1.4rem', opacity: 0.5 }}>⏱</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '0.75rem',
                padding: '1.25rem 1.5rem',
                background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
                color: '#fff', borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 16px rgba(79,70,229,.3)',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', opacity: 0.9 }}>Estimated Payable</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.15rem' }}>Subject to HR approval</div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
                  ₹{result.finalPayable?.toLocaleString('en-IN')}
                </div>
              </div>
            </>
          )}
        </div>
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

      {/* ── Monthly Hours History ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2>Monthly Class Hours</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>Last 12 months</span>
        </div>

        {hoursLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : hoursSummary.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">📅</div>
            <h3>No completed sessions yet</h3>
            <p>Your monthly hours will appear here once sessions are recorded</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Sessions</th>
                  <th style={{ textAlign: 'right' }}>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {hoursSummary.map((row) => (
                  <tr key={`${row.year}-${row.month}`}>
                    <td style={{ fontWeight: 600 }}>{MONTHS[row.month - 1]} {row.year}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.sessionCount}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.totalHours.toFixed(1)} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
