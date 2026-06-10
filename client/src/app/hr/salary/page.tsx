'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/faculty.service'
import { calculate, approve } from '@/services/salary.service'
import type { Faculty, SalaryResult, SalaryAlert } from '@/types'
import { ErrorAlert } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Salary slip print (popup window) ─────────────────────────────────────────

/** Escape special HTML characters to prevent XSS when inserting user data into document.write(). */
function escapeHtml(s: string | number | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function printSalarySlip(faculty: Faculty, month: number, year: number, result: SalaryResult, onError: (msg: string) => void) {
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
  if (!win) { onError('Popups are blocked — please allow popups for this site to print salary slips.'); return }

  const breakdown = (result.breakdown ?? []).map((row) => `
    <tr class="${row.isDeduction ? 'ded' : ''}">
      <td>${row.isDeduction ? '&minus; ' : ''}${escapeHtml(row.label)}</td>
      <td>${/\bhours?\b|\bhrs\b|\bquota\b/i.test(row.label) ? escapeHtml(row.amount % 1 === 0 ? row.amount : row.amount.toFixed(1)) + ' hrs' : (Number.isInteger(row.amount) || row.amount > 100 ? '&#8377;' + escapeHtml(row.amount.toLocaleString('en-IN')) : escapeHtml(row.amount.toFixed(1)))}</td>
    </tr>`).join('')

  const carryHtml = result.carryForward ? `
    <div class="section-title">Hour Carry-Forward</div>
    <div class="carry">
      <div><div class="clabel">Prev Month Balance</div><div class="cval">${escapeHtml(result.carryForward.previousMonthBalance.toFixed(1))} hrs</div></div>
      <div><div class="clabel">This Month Balance</div><div class="cval">${escapeHtml(result.carryForward.currentMonthBalance.toFixed(1))} hrs</div></div>
      <div><div class="clabel">Combined Total</div><div class="cval">${escapeHtml(result.carryForward.combinedTotal.toFixed(1))} hrs</div></div>
    </div>` : ''

  const alertsHtml = (result.alerts ?? []).filter((a) => a.level !== 'BLOCK').map((a) => `
    <div class="alert-row ${a.level === 'WARNING' ? 'alert-warn' : 'alert-info'}">${escapeHtml(a.message)}</div>`).join('')

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const hoursRow = result.hoursLogged != null ? `<div><div class="flabel">Hours Logged</div><div class="fval">${escapeHtml(result.hoursLogged)} hrs</div></div>` : ''
  const daysRow  = result.daysWorked  != null ? `<div><div class="flabel">Days Worked</div><div class="fval">${escapeHtml(result.daysWorked)} days</div></div>` : ''

  win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Salary Slip &#8212; ${escapeHtml(faculty.name)} &#8212; ${escapeHtml(MONTHS_LONG[month-1])} ${escapeHtml(year)}</title>
<style>
@page{size:A4;margin:18mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;font-size:14px}
.slip{max-width:680px;margin:0 auto;padding:2rem}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #4f46e5;padding-bottom:1.25rem;margin-bottom:1.5rem}
.org{font-size:1.375rem;font-weight:800;color:#4f46e5;letter-spacing:-.02em}
.org-sub{font-size:.75rem;color:#64748b;margin-top:.2rem}
.period-lbl{font-size:.8rem;font-weight:700;color:#64748b;text-align:right}
.period{font-size:1.25rem;font-weight:800;color:#1e293b;text-align:right}
.fbox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:.625rem}
.flabel{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:600}
.fval{font-size:.9375rem;font-weight:700;color:#1e293b;margin-top:.1rem}
.section-title{font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700;margin:1.5rem 0 .625rem}
table{width:100%;border-collapse:collapse}
td{padding:.45rem .5rem;font-size:.875rem;border-bottom:1px solid #f1f5f9}
td:last-child{text-align:right;font-weight:600}
tr.ded td{color:#dc2626}
.total-row td{border-top:2px solid #4f46e5;padding-top:.75rem;font-size:1rem;font-weight:800;color:#4f46e5;border-bottom:none}
.carry{background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:.75rem 1rem;display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.5rem}
.clabel{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:#92400e;font-weight:600}
.cval{font-size:.9375rem;font-weight:700;color:#b45309;margin-top:.15rem}
.alerts{display:flex;flex-direction:column;gap:.375rem;margin-top:.5rem}
.alert-row{font-size:.8rem;padding:.375rem .75rem;border-radius:5px;border-left:3px solid}
.alert-info{background:#eff6ff;border-color:#3b82f6;color:#1e40af}
.alert-warn{background:#fffbeb;border-color:#f59e0b;color:#92400e}
.footer{margin-top:3rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:2rem}
.sig{border-top:1px solid #94a3b8;padding-top:.375rem;font-size:.75rem;color:#64748b;text-align:center}
.print-btn{position:fixed;bottom:1.5rem;right:1.5rem;background:#4f46e5;color:#fff;border:none;border-radius:50px;padding:.75rem 1.5rem;font-size:1rem;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(79,70,229,.4)}
@media print{.print-btn{display:none}}
</style></head><body>
<div class="slip">
  <div class="hdr">
    <div><div class="org">DOPA Coaching</div><div class="org-sub">Calicut, Kerala</div></div>
    <div><div class="period-lbl">Salary Slip</div><div class="period">${escapeHtml(MONTHS_LONG[month-1])} ${escapeHtml(year)}</div></div>
  </div>
  <div class="fbox">
    <div><div class="flabel">Faculty Name</div><div class="fval">${escapeHtml(faculty.name)}</div></div>
    <div><div class="flabel">Subject</div><div class="fval">${escapeHtml(faculty.subject) || '&mdash;'}</div></div>
    <div><div class="flabel">Pay Period</div><div class="fval">${escapeHtml(MONTHS_LONG[month-1])} ${escapeHtml(year)}</div></div>
    <div><div class="flabel">Generated On</div><div class="fval">${escapeHtml(today)}</div></div>
    ${hoursRow}${daysRow}
  </div>
  ${alertsHtml ? `<div class="section-title">Notes</div><div class="alerts">${alertsHtml}</div>` : ''}
  ${carryHtml}
  ${breakdown ? `<div class="section-title">Pay Breakdown</div><table><tbody>${breakdown}<tr class="total-row"><td>Net Payable</td><td>&#8377;${escapeHtml(result.finalPayable?.toLocaleString('en-IN') ?? '0')}</td></tr></tbody></table>` : ''}
  <div class="footer">
    <div class="sig">Prepared by HR</div>
    <div class="sig">Faculty Signature</div>
    <div class="sig">Authorised Signatory</div>
  </div>
</div>
<button class="print-btn" onclick="window.print()">🖨 Print</button>
<script>setTimeout(function(){window.print()},600)</script>
</body></html>`)
  win.document.close()
}

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
            <select className="input" value={month} onChange={(e) => { setMonth(+e.target.value); setResult(null); setApproved(false) }} style={{ minWidth: 100 }}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Year</label>
            <input type="number" className="input" value={year} onChange={(e) => { setYear(+e.target.value); setResult(null); setApproved(false) }} style={{ width: 100 }} />
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
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorAlert message={error} what="Salary calculation failed" onRetry={handleCalculate} />
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
              <div className="carry-grid">
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
                          {/\bhours?\b|\bhrs\b|\bquota\b/i.test(row.label)
                            ? `${row.amount % 1 === 0 ? row.amount : row.amount.toFixed(1)} hrs`
                            : (Number.isInteger(row.amount) || row.amount > 100
                                ? `₹${row.amount.toLocaleString('en-IN')}`
                                : row.amount.toFixed(1))}
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
                flexWrap: 'wrap', gap: '0.75rem',
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

              {/* Approve + Print row */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {approved ? (
                  <div className="alert alert-success" style={{ flex: 1, margin: 0 }}>
                    <span className="alert-icon">✅</span>
                    Salary approved and recorded for {MONTHS[month - 1]} {year}.
                  </div>
                ) : (
                  <button
                    className="btn btn-success"
                    onClick={handleApprove}
                    disabled={approving || !canApprove}
                    style={{ flex: 1 }}
                  >
                    {approving ? (
                      <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Approving…</>
                    ) : '✓ Approve & Record Salary'}
                  </button>
                )}
                {selectedFaculty && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => printSalarySlip(selectedFaculty, month, year, result, setError)}
                    title="Open printable salary slip in new window"
                  >
                    🖨 Print Slip
                  </button>
                )}
              </div>
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
