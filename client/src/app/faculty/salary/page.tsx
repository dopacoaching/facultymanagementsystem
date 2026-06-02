'use client'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { calculate, getMyHistory } from '@/services/salary.service'
import type { SalaryHistoryRecord } from '@/services/salary.service'
import type { SalaryResult, SalaryAlert } from '@/types'

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

export default function FacultySalaryPage() {
  const { accessToken, facultyId } = useAppSelector((s) => s.auth)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [result, setResult] = useState<SalaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<SalaryHistoryRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

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

  async function loadHistory() {
    if (!accessToken) return
    setHistoryLoading(true)
    try {
      const data = await getMyHistory(accessToken)
      setHistory(data)
      setShowHistory(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load history')
    } finally { setHistoryLoading(false) }
  }

  return (
    <div>
      {/* Controls */}
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
          <button
            className="btn btn-ghost"
            onClick={loadHistory}
            disabled={historyLoading}
            style={{ alignSelf: 'flex-end' }}
          >
            {historyLoading ? <><span className="spinner" /> Loading…</> : '🕐 View History'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <span className="alert-icon">⚠</span>
          <div>{error}</div>
        </div>
      )}

      {result && (
        <div className="card">
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

          {/* Alerts */}
          {result.alerts && result.alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {result.alerts.map((alert, i) => (
                <div key={i} className={alertClass(alert.level)}>
                  <span className="alert-icon">{alertIcon(alert.level)}</span>
                  <div><strong>[{alert.code}]</strong> {alert.message}</div>
                </div>
              ))}
            </div>
          )}

          {(result.status === 'OK' || result.status === 'HR_REVIEW') && (
            <>
              {/* Breakdown */}
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

              {/* Summary stats */}
              <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                {([
                  ['Hours', result.hoursLogged   != null ? `${result.hoursLogged} hrs` : null,  '⏱'],
                  ['Days',  result.daysWorked     != null ? `${result.daysWorked} days` : null,  '📅'],
                  ['Base',  result.baseSalary     != null ? `₹${result.baseSalary.toLocaleString('en-IN')}` : null, '💰'],
                ] as [string, string | null, string][]).filter(([, v]) => v != null).map(([label, value, icon]) => (
                  <div key={label} className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="stat-label">{label}</div>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem', marginTop: '0.25rem' }}>{value}</div>
                      </div>
                      <span style={{ fontSize: '1.25rem', opacity: 0.6 }}>{icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final payable */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '0.75rem',
                padding: '1.25rem 1.5rem',
                background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
                color: '#fff', borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 16px rgba(79,70,229,.3)',
                marginBottom: '0.75rem',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', opacity: 0.9 }}>Estimated Payable</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.15rem' }}>Subject to HR approval</div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
                  ₹{result.finalPayable?.toLocaleString('en-IN')}
                </div>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                * This is an estimate. The final amount will be confirmed after HR approval.
              </p>
            </>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">₹</div>
            <h3>Select month and click Check Salary</h3>
            <p>Your salary estimate will appear here based on logged sessions</p>
          </div>
        </div>
      )}

      {/* ── Approved Salary History ─────────────────────────────────────────── */}
      {showHistory && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: 700, margin: 0, fontSize: '1rem' }}>
              Approved Salary History
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(false)}>Hide</button>
          </div>
          {history.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon" style={{ fontSize: '1.5rem' }}>📭</div>
              <h3>No approved salaries yet</h3>
              <p>Approved salary records will appear here</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th style={{ textAlign: 'right' }}>Base</th>
                    <th style={{ textAlign: 'right' }}>Deductions</th>
                    <th style={{ textAlign: 'right' }}>Final Payable</th>
                    <th>Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h._id}>
                      <td style={{ fontWeight: 600 }}>{MONTHS[h.month - 1]} {h.year}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {h.baseSalary != null ? `₹${h.baseSalary.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums' }}>
                        {h.penaltiesApplied ? `−₹${h.penaltiesApplied.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{h.finalPayable.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(h.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
