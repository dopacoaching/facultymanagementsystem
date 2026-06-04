'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getSessions } from '@/services/session.service'
import { getById as getFacultyById } from '@/services/faculty.service'
import { calculate } from '@/services/salary.service'
import type { Session } from '@/types'
import type { Faculty } from '@/types'
import type { SalaryResult } from '@/types'
import Link from 'next/link'

const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function FacultyDashboard() {
  const { accessToken, facultyId } = useAppSelector((s) => s.auth)

  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  const [faculty,   setFaculty]   = useState<Faculty | null>(null)
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [salary,    setSalary]    = useState<SalaryResult | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!accessToken || !facultyId) return

    setLoading(true)
    Promise.all([
      getFacultyById(facultyId, accessToken),
      getSessions({ facultyId, limit: 10 } as Parameters<typeof getSessions>[0], accessToken),
      calculate(facultyId, month, year, accessToken),
    ])
      .then(([fac, sess, sal]) => {
        setFaculty(fac)
        setSessions(sess)
        setSalary(sal)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken, facultyId]) // eslint-disable-line

  const thisMonthSessions = sessions.filter((s) => {
    const d = new Date(s.sessionDate)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })
  const completed   = thisMonthSessions.filter((s) => s.status === 'COMPLETED')
  const upcoming    = sessions.filter((s) => s.status === 'SCHEDULED')
  const totalHours  = completed.reduce((sum, s) => sum + s.durationHours, 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  return (
    <div>
      {/* ── Welcome banner ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #3730a3, #4f46e5 60%, #6366f1)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem 2rem',
        color: '#fff',
        marginBottom: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px rgba(79,70,229,.3)',
      }}>
        <div>
          <div style={{ fontSize: '0.8125rem', opacity: 0.7, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
            Welcome back
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.625rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>
            {faculty?.name ?? '—'}
          </h1>
          <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>
            {faculty?.subject ?? ''} · <span style={{ opacity: 0.65 }}>{faculty?.type ?? ''}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.65, marginBottom: '0.25rem' }}>This month</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1 }}>{MONTHS[month - 1]} {year}</div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        {[
          { label: 'Sessions This Month', value: completed.length,       icon: '✅', color: 'var(--color-success)' },
          { label: 'Hours This Month',    value: `${totalHours.toFixed(1)} hrs`, icon: '⏱', color: 'var(--color-primary)' },
          { label: 'Upcoming',            value: upcoming.length,        icon: '⏳', color: 'var(--color-accent)' },
          { label: 'Est. Salary',
            value: salary?.finalPayable != null
              ? `₹${salary.finalPayable.toLocaleString('en-IN')}`
              : salary?.status === 'PENDING_CONFIG' ? 'Pending' : '—',
            icon: '₹',
            color: 'var(--color-success)',
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color, fontSize: '1.5rem', marginTop: '0.25rem' }}>{value}</div>
              </div>
              <span style={{ fontSize: '1.4rem', opacity: 0.6 }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Salary snapshot ────────────────────────────────────────────────── */}
      {salary && (salary.status === 'OK' || salary.status === 'HR_REVIEW') && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>Salary Estimate — {MONTHS[month - 1]} {year}</h2>
            <span className={`badge ${salary.status === 'OK' ? 'badge-green' : 'badge-yellow'}`}>
              {salary.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="stats-grid">
            {([
              ['Hours Logged', salary.hoursLogged != null ? `${salary.hoursLogged} hrs` : null, '⏱'],
              ['Days Worked',  salary.daysWorked  != null ? `${salary.daysWorked} days` : null, '📅'],
              ['Base Salary',  salary.baseSalary  != null ? `₹${salary.baseSalary.toLocaleString('en-IN')}` : null, '💰'],
              ['Deductions',   salary.penalties   ? `−₹${salary.penalties.toLocaleString('en-IN')}` : null, '📉'],
            ] as [string, string | null, string][]).filter(([, v]) => v != null).map(([label, value, icon]) => (
              <div key={label} className="stat-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">{label}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.0625rem', marginTop: '0.25rem', color: label === 'Deductions' ? 'var(--color-danger)' : 'var(--color-text)' }}>{value}</div>
                  </div>
                  <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>{icon}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '0.75rem',
            padding: '1rem 1.5rem',
            background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
            borderRadius: 'var(--radius-lg)', color: '#fff',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', opacity: 0.85 }}>Estimated Payable</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.1rem' }}>Subject to HR approval</div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>₹{salary.finalPayable?.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ textAlign: 'right', marginTop: '0.875rem' }}>
            <Link href="/faculty/salary" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Full salary details →
            </Link>
          </div>
        </div>
      )}

      {/* ── Recent sessions ────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2>Recent Sessions</h2>
          <Link href="/faculty/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No sessions yet</h3>
            <p>Your sessions will appear here once logged</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Date</th>
                  <th>Hrs</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 8).map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>{s.subject}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.chapter}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.durationHours}h</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
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
