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

const COORDINATOR_TOKEN = process.env.NEXT_PUBLIC_COORDINATOR_TOKEN ?? ''

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

// ─── Coordinator Access Link card ─────────────────────────────────────────────
function CoordinatorAccessSection() {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const fullUrl = origin ? `${origin}/c/${COORDINATOR_TOKEN}` : `/c/${COORDINATOR_TOKEN}`

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section>
      <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.875rem' }}>
        Class Teacher Access
      </h2>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
            📝 Session Log Form (Secret Link)
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Share this link with class teachers only — it is not linked anywhere on the website.
          </div>
          <code style={{
            display: 'block',
            fontSize: '0.8125rem',
            padding: '0.4rem 0.75rem',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            wordBreak: 'break-all',
            fontFamily: 'monospace',
          }}>
            {fullUrl}
          </code>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8125rem', padding: '0.475rem 1rem' }}
            onClick={handleCopy}
          >
            {copied ? '✅ Copied!' : '📋 Copy Link'}
          </button>
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ fontSize: '0.8125rem', padding: '0.475rem 1rem', textDecoration: 'none' }}
          >
            ↗ Open
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)

  const [faculty,     setFaculty]     = useState<Faculty[]>([])
  const [acSessions,  setAcSessions]  = useState<Session[]>([])
  const [isSessions,  setIsSessions]  = useState<ISession[]>([])
  const [auditLogs,   setAuditLogs]   = useState<AuditLog[]>([])

  useEffect(() => {
    if (!accessToken) return
    getFaculty(accessToken, true).then(setFaculty).catch(console.error)  // include inactive for accurate stats
    getSessions({}, accessToken).then(setAcSessions).catch(console.error)
    apiFetch<ISession[]>('/integrated-school/sessions', { token: accessToken }).then(setIsSessions).catch(console.error)
    getAuditLog(accessToken, 1, 8).then((r) => setAuditLogs(r.logs)).catch(console.error)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Quick links ──────────────────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.875rem' }}>
          Sections
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <QuickLink href="/hr/faculty"         icon="👥" label="Faculty"        desc="Manage faculty profiles" />
          <QuickLink href="/hr/salary"           icon="₹"  label="Salary"         desc="Calculate & approve pay" />
          <QuickLink href="/admin/audit-log"     icon="📋" label="Audit Log"      desc="View all system events" />
          <QuickLink href="/hr/reports"          icon="📊" label="Reports"        desc="Salary history & exports" />
          <QuickLink href="/academics/sessions"  icon="📅" label="AC Sessions"    desc="Repeaters class sessions" />
          <QuickLink href="/academics/schedule"  icon="🗓" label="AC Schedule"    desc="Weekly schedule" />
          <QuickLink href="/academics/exams"     icon="📝" label="Exam Topics"    desc="Chapters & exam topics" />
          <QuickLink href="/is/sessions"         icon="🏫" label="IS Sessions"    desc="Integrated School sessions" />
          <QuickLink href="/is/timetable"        icon="⏱" label="IS Timetable"   desc="Integrated School timetable" />
        </div>
      </section>

      {/* ── Coordinator Access ───────────────────────────────────────────────── */}
      <CoordinatorAccessSection />

      {/* ── HR Stats ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.875rem' }}>
          HR Overview
        </h2>
        <div className="stats-grid">
          {[
            { label: 'Total Faculty',    value: faculty.length,   icon: '👥', color: 'var(--color-primary)' },
            { label: 'Active',           value: activeFaculty,    icon: '✅', color: 'var(--color-success)' },
            { label: 'Inactive',         value: inactiveFaculty,  icon: '⏸',  color: 'var(--color-muted)'   },
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

      {/* ── Academics Stats ───────────────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.875rem' }}>
          Academics (Repeaters)
        </h2>
        <div className="stats-grid">
          {[
            { label: 'Total Sessions', value: acSessions.length, icon: '📚', color: 'var(--color-primary)' },
            { label: "Today's",        value: todayAC,           icon: '📅', color: 'var(--color-accent)'  },
            { label: 'Completed',      value: acCompleted,       icon: '✅', color: 'var(--color-success)' },
            { label: 'Scheduled',      value: acScheduled,       icon: '⏳', color: 'var(--color-info)'    },
            { label: 'Cancelled',      value: acCancelled,       icon: '❌', color: 'var(--color-danger)'  },
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

      {/* ── IS Stats ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: '0.875rem' }}>
          Integrated School
        </h2>
        <div className="stats-grid">
          {[
            { label: 'Total IS Sessions', value: isSessions.length, icon: '🏫', color: 'var(--color-primary)' },
            { label: "Today's IS",        value: todayIS,           icon: '📅', color: 'var(--color-accent)'  },
            { label: 'IS Completed',      value: isCompleted,       icon: '✅', color: 'var(--color-success)' },
            { label: 'IS Scheduled',      value: isScheduled,       icon: '⏳', color: 'var(--color-info)'    },
            { label: 'IS Cancelled',      value: isCancelled,       icon: '❌', color: 'var(--color-danger)'  },
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
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">👥</div>
              <p>No faculty added yet</p>
            </div>
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
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">📅</div>
              <p>No sessions logged yet</p>
            </div>
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

        {/* Recent IS Sessions */}
        <div className="card">
          <div className="card-header">
            <h2>Recent IS Sessions</h2>
            <Link href="/is/sessions" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {isSessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">🏫</div>
              <p>No IS sessions yet</p>
            </div>
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
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">📋</div>
              <p>No recent activity</p>
            </div>
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
