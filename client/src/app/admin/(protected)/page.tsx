'use client'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty } from '@/services/faculty.service'
import { getAll as getSessions } from '@/services/session.service'
import { getAuditLog } from '@/services/salary.service'
import { apiFetch } from '@/services/api'
import type { Faculty, AuditLog } from '@/types'
import type { Session } from '@/types'
import Link from 'next/link'
import { SkeletonStats, SkeletonCard, EmptyState } from '@/components/ui/Skeleton'

interface ISession {
  _id: string
  facultyId: { name: string } | string | null
  subject: string
  sessionDate: string
  status: string
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
}

const EVENT_BADGE: Record<string, string> = {
  SALARY_APPROVED:       'badge-green',
  PENALTY_APPLIED:       'badge-red',
  SESSION_CANCELLED:     'badge-red',
  PAY_CONFIG_UPDATED:    'badge-yellow',
  SALARY_FIELD_CHANGED:  'badge-yellow',
  OVERTIME_ADDED:        'badge-blue',
  BALANCE_CARRY_FORWARD: 'badge-blue',
  FACULTY_CREATED:       'badge-green',
  FACULTY_UPDATED:       'badge-gray',
}

// ─── Section link card ────────────────────────────────────────────────────────
function QuickLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(79,70,229,.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      >
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>{desc}</div>
        </div>
      </div>
    </Link>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)

  const [faculty,     setFaculty]     = useState<Faculty[]>([])
  const [acSessions,  setAcSessions]  = useState<Session[]>([])
  const [isSessions,  setIsSessions]  = useState<ISession[]>([])
  const [auditLogs,   setAuditLogs]   = useState<AuditLog[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    Promise.all([
      getFaculty(accessToken, true).catch(() => [] as Faculty[]),
      getSessions({}, accessToken).catch(() => [] as Session[]),
      apiFetch<ISession[]>('/ig/sessions', { token: accessToken }).catch(() => [] as ISession[]),
      getAuditLog(accessToken, 1, 8).catch(() => ({ logs: [] as AuditLog[] })),
    ]).then(([fac, ac, is, audit]) => {
      setFaculty(fac as Faculty[])
      setAcSessions(ac as Session[])
      setIsSessions(is as ISession[])
      setAuditLogs((audit as { logs: AuditLog[] }).logs)
    }).finally(() => setLoading(false))
  }, [accessToken])

  // ── derived counts ──────────────────────────────────────────────────────────
  const activeFaculty   = faculty.filter((f) => f.isActive).length
  const inactiveFaculty = faculty.length - activeFaculty

  const acCompleted = acSessions.filter((s) => s.status === 'COMPLETED').length
  const acCancelled = acSessions.filter((s) => s.status === 'CANCELLED').length
  const acScheduled = acSessions.filter((s) => s.status === 'SCHEDULED').length

  const isCompleted = isSessions.filter((s) => s.status === 'COMPLETED').length
  const isCancelled = isSessions.filter((s) => s.status === 'CANCELLED').length
  const isScheduled = isSessions.filter((s) => s.status === 'SCHEDULED').length

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayAC  = acSessions.filter((s) => s.sessionDate?.startsWith(todayStr)).length
  const todayIS  = isSessions.filter((s) => s.sessionDate?.startsWith(todayStr)).length

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <SkeletonStats count={3} />
        <div className="panel-grid-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Quick links ──────────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* HR */}
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: '0.625rem' }}>
              HR &amp; Payroll
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
              <QuickLink href="/hr/faculty"     icon="👥" label="Faculty"    desc="Manage faculty profiles" />
              <QuickLink href="/hr/salary"       icon="₹"  label="Salary"     desc="Calculate &amp; approve pay" />
              <QuickLink href="/hr/reports"      icon="📊" label="Reports"    desc="Salary history &amp; exports" />
              <QuickLink href="/admin/audit-log" icon="📋" label="Audit Log"  desc="View all system events" />
            </div>
          </div>

          {/* Academics */}
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: '0.625rem' }}>
              Academics (Repeaters)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
              <QuickLink href="/academics/sessions" icon="📅" label="Sessions"   desc="Log &amp; view class sessions" />
              <QuickLink href="/academics/schedule" icon="🗓" label="Schedule"   desc="Weekly class schedule" />
              <QuickLink href="/academics/exams"    icon="📝" label="Exam Topics" desc="Monday &amp; Friday exam topics" />
              <QuickLink href="/academics/syllabus" icon="📋" label="Syllabus"   desc="Annual syllabus plan" />
            </div>
          </div>

          {/* Integrated School */}
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: '0.625rem' }}>
              Integrated School
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
              <QuickLink href="/ig/sessions"  icon="🏫" label="IG Sessions"  desc="Log &amp; view IG sessions" />
              <QuickLink href="/ig/timetable" icon="⏱"  label="IG Timetable" desc="Daily class assignments" />
              <QuickLink href="/ig/chapters"  icon="📖" label="IG Chapters"  desc="Chapter scheduling progress" />
            </div>
          </div>

        </div>
      </section>

      {/* ── Stats row: HR + Academics + IG side by side ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

        {/* HR Stats */}
        <section>
          <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            HR Overview
          </h2>
          <div className="stats-grid">
            {[
              { label: 'Total Faculty', value: faculty.length,   icon: '👥', color: 'var(--color-primary)' },
              { label: 'Active',        value: activeFaculty,    icon: '✅', color: 'var(--color-success)' },
              { label: 'Inactive',      value: inactiveFaculty,  icon: '⏸',  color: 'var(--color-muted)'   },
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
        </section>

        {/* Academics Stats */}
        <section>
          <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            Academics (Repeaters)
          </h2>
          <div className="stats-grid">
            {[
              { label: 'Total',     value: acSessions.length, icon: '📚', color: 'var(--color-primary)' },
              { label: "Today",     value: todayAC,           icon: '📅', color: 'var(--color-accent)'  },
              { label: 'Done',      value: acCompleted,       icon: '✅', color: 'var(--color-success)' },
              { label: 'Scheduled', value: acScheduled,       icon: '⏳', color: 'var(--color-info)'    },
              { label: 'Cancelled', value: acCancelled,       icon: '❌', color: 'var(--color-danger)'  },
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
        </section>

        {/* IG Stats */}
        <section>
          <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            Integrated School
          </h2>
          <div className="stats-grid">
            {[
              { label: 'Total',     value: isSessions.length, icon: '🏫', color: 'var(--color-primary)' },
              { label: 'Today',     value: todayIS,           icon: '📅', color: 'var(--color-accent)'  },
              { label: 'Done',      value: isCompleted,       icon: '✅', color: 'var(--color-success)' },
              { label: 'Scheduled', value: isScheduled,       icon: '⏳', color: 'var(--color-info)'    },
              { label: 'Cancelled', value: isCancelled,       icon: '❌', color: 'var(--color-danger)'  },
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
        </section>

      </div>

      {/* ── Details grid ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

        {/* Faculty list */}
        <div className="card">
          <div className="card-header">
            <h2>Faculty</h2>
            <Link href="/hr/faculty" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {faculty.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No faculty added yet"
              description="Add the first faculty member to get started."
              action={{ label: 'Add Faculty', onClick: () => window.location.href = '/hr/faculty' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {faculty.slice(0, 7).map((f) => (
                <div key={f._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.625rem 0.5rem', borderRadius: '0.5rem', transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {f.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{f.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{f.subject}</div>
                    </div>
                  </div>
                  <span className={`badge ${f.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {f.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Academic Sessions */}
        <div className="card">
          <div className="card-header">
            <h2>Recent AC Sessions</h2>
            <Link href="/academics/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {acSessions.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No sessions logged yet"
              description="Sessions will appear here once coordinators start logging classes."
            />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Faculty</th><th>Subject</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {acSessions.slice(0, 6).map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 500 }}>
                        {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                      </td>
                      <td>{s.subject}</td>
                      <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                        {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
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

        {/* Recent IG Sessions */}
        <div className="card">
          <div className="card-header">
            <h2>Recent IG Sessions</h2>
            <Link href="/ig/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {isSessions.length === 0 ? (
            <EmptyState
              icon="🏫"
              title="No IG sessions yet"
              description="IG sessions will appear here once they are logged."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {isSessions.slice(0, 6).map((s) => (
                <div key={s._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.575rem 0.5rem', borderRadius: '0.5rem', transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {(typeof s.facultyId === 'object' ? s.facultyId?.name : s.facultyId) ?? '—'}
                      {' · '}
                      {new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-gray'}`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit Log */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <Link href="/admin/audit-log" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {auditLogs.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No recent activity"
              description="System events will be recorded here as actions are taken."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {auditLogs.map((log) => (
                <div key={log._id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.625rem 0',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <span className={`badge ${EVENT_BADGE[log.eventType] ?? 'badge-gray'}`} style={{ flexShrink: 0, marginTop: '0.15rem' }}>
                    {log.eventType.replace(/_/g, ' ')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.facultyName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {log.amount > 0 && <> · ₹{log.amount.toLocaleString('en-IN')}</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
