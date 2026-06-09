'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getDashboard } from '@/services/salary.service'
import type { DashboardData, HoursProgressItem, PayrollStatusItem } from '@/services/salary.service'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function progressColor(status: HoursProgressItem['status']): string {
  if (status === 'MET')      return 'var(--color-success)'
  if (status === 'ON_TRACK') return 'var(--color-primary)'
  if (status === 'AT_RISK')  return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function progressBg(status: HoursProgressItem['status']): string {
  if (status === 'MET')      return '#dcfce7'
  if (status === 'ON_TRACK') return '#ede9fe'
  if (status === 'AT_RISK')  return '#fef9c3'
  return '#fee2e2'
}

function payrollBadge(status: PayrollStatusItem['status']): string {
  if (status === 'APPROVED') return 'badge-green'
  if (status === 'PENDING')  return 'badge-yellow'
  return 'badge-red'
}

function contractShortName(type: string): string {
  const map: Record<string, string> = {
    FIXED_QUOTA_CARRYFORWARD: 'Carry-Fwd Quota',
    FIXED_QUOTA_NOCARRY:      'Display Quota',
    BASE_OVERTIME:            'Base + Overtime',
  }
  return map[type] ?? type
}

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

  const t = data?.totals

  return (
    <div>
      {/* ── Month / Year selector ── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label">Month</label>
          <select className="input" value={month} onChange={(e) => setMonth(+e.target.value)} style={{ minWidth: 100 }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label">Year</label>
          <input type="number" className="input" value={year} onChange={(e) => setYear(+e.target.value)} style={{ width: 90 }} />
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading} style={{ marginBottom: '0.05rem' }}>
          {loading ? <><span className="spinner" /> Refreshing…</> : '↻ Refresh'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--color-muted)', alignSelf: 'center' }}>
          {MONTHS[month - 1]} {year} overview
        </span>
      </div>

      {/* ── Top stats ── */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Faculty',   value: t?.totalFaculty ?? '—',  icon: '👥', color: 'var(--color-primary)' },
          { label: 'Approved',        value: t?.approved     ?? '—',  icon: '✅', color: 'var(--color-success)' },
          { label: 'Pending Approval',value: t?.pending      ?? '—',  icon: '⏳', color: 'var(--color-warning)' },
          { label: 'Blocked',         value: t?.blocked      ?? '—',  icon: '🚫', color: 'var(--color-danger)'  },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color }}>{value}</div>
              </div>
              <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row: Penalties + Overtime ── */}
      {t && (t.totalPenalties > 0 || t.totalOvertimePay > 0) && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          {t.totalPenalties > 0 && (
            <div className="stat-card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
              <div className="stat-label">Total Penalties Applied</div>
              <div className="stat-value" style={{ color: 'var(--color-danger)', fontSize: '1.375rem' }}>
                ₹{t.totalPenalties.toLocaleString('en-IN')}
              </div>
              <div className="stat-sub">{MONTHS[month - 1]} {year} · approved records only</div>
            </div>
          )}
          {t.totalOvertimePay > 0 && (
            <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <div className="stat-label">Overtime Pay</div>
              <div className="stat-value" style={{ color: 'var(--color-accent)', fontSize: '1.375rem' }}>
                ₹{t.totalOvertimePay.toLocaleString('en-IN')}
              </div>
              <div className="stat-sub">{t.totalOvertimeHours.toFixed(1)} hrs overtime</div>
            </div>
          )}
          {t.totalPayroll > 0 && (
            <div className="stat-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
              <div className="stat-label">Total Payroll Approved</div>
              <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.375rem' }}>
                ₹{t.totalPayroll.toLocaleString('en-IN')}
              </div>
              <div className="stat-sub">{t.approved} of {t.totalFaculty} faculty</div>
            </div>
          )}
        </div>
      )}

      {/* ── Hours Progress (quota-based faculty) ── */}
      {(data?.hoursProgress?.length ?? 0) > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>Hours vs Quota Progress</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Quota-based faculty only</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data!.hoursProgress.map((item) => (
              <div key={item.facultyId.toString()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginLeft: '0.5rem' }}>
                      {contractShortName(item.contractType)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.logged.toFixed(1)} / {item.quota} hrs
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                        borderRadius: 999,
                        background: progressBg(item.status),
                        color: progressColor(item.status),
                      }}
                    >
                      {item.status === 'MET' ? '✓ Met' : item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{
                  height: 8, borderRadius: 4,
                  background: 'var(--color-surface-2)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, item.pct)}%`,
                    background: progressColor(item.status),
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                {/* Deficit / surplus note */}
                {item.deficit > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-danger)', marginTop: '0.25rem' }}>
                    ↓ {item.deficit.toFixed(1)} hrs short of quota
                  </div>
                )}
                {item.surplus > 0 && item.contractType === 'BASE_OVERTIME' && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                    ↑ {item.surplus.toFixed(1)} hrs overtime
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-column row: Payroll Status + Cancellation Log ── */}
      <div className="panel-grid-2">

        {/* Panel 6: Payroll Status */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h2>Payroll Status</h2>
            <Link
              href="/hr/salary"
              style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Open Calculator →
            </Link>
          </div>
          {loading && !data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[1,2,3,4].map((i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.375rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <Skeleton height="0.875rem" width={120} />
                    <Skeleton height="0.7rem" width={70} />
                  </div>
                  <Skeleton height="1.25rem" width={60} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {(data?.payrollStatus ?? []).map((item) => (
                <div
                  key={item.facultyId.toString()}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.375rem',
                    borderRadius: '0.375rem',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{item.subject}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.status === 'APPROVED' && item.finalPayable != null && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{item.finalPayable.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className={`badge ${payrollBadge(item.status)}`} style={{ fontSize: '0.7rem' }}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
              {(data?.payrollStatus ?? []).length === 0 && (
                <div className="empty-state" style={{ padding: '1.5rem' }}>
                  <div className="empty-state-icon" style={{ fontSize: '1.25rem' }}>📊</div>
                  <p>No faculty data</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel 5: Cancellation Log */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header">
            <h2>Cancellation Log</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{MONTHS[month - 1]} {year}</span>
          </div>
          {(data?.cancellationLog ?? []).length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-state-icon" style={{ fontSize: '1.25rem' }}>✅</div>
              <p>No cancellations this month</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(data?.cancellationLog ?? []).map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--color-surface-2)',
                    borderLeft: `3px solid ${c.cancellationInitiator === 'FACULTY' ? 'var(--color-warning)' : 'var(--color-danger)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{c.facultyName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.1rem' }}>
                        {c.subject} · {c.chapter}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(c.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                      <div style={{
                        fontSize: '0.68rem', fontWeight: 700, marginTop: '0.15rem',
                        color: c.cancellationInitiator === 'FACULTY' ? 'var(--color-warning)' : 'var(--color-danger)',
                      }}>
                        {c.cancellationInitiator}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick links ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { href: '/hr/faculty', label: '👥 Manage Faculty' },
          { href: '/hr/salary',  label: '⚡ Salary Calculator' },
          { href: '/hr/reports', label: '📊 Reports & CSV' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-border)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
