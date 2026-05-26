'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCredentials } from '@/store/slices/authSlice'
import { logout, changePassword } from '@/services/auth.service'

interface NavItem {
  label: string
  href: string
  icon: string
}

// ─── Role navs ────────────────────────────────────────────────────────────────

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/admin',              icon: '◈' },
  // System
  { label: 'Users',        href: '/admin/users',        icon: '🔐' },
  { label: 'Audit Log',    href: '/admin/audit-log',    icon: '📋' },
  // HR section
  { label: 'Faculty',      href: '/hr/faculty',         icon: '👥' },
  { label: 'Salary',       href: '/hr/salary',          icon: '₹' },
  { label: 'Reports',      href: '/hr/reports',         icon: '📊' },
  // Academics (Repeaters)
  { label: 'AC Sessions',  href: '/academics/sessions',  icon: '📅' },
  { label: 'Chapters',     href: '/academics/chapters',  icon: '📚' },
  { label: 'Schedule',     href: '/academics/schedule',  icon: '🗓' },
  { label: 'Exam Topics',  href: '/academics/exams',     icon: '📝' },
  { label: 'AC Reports',   href: '/academics/reports',   icon: '📊' },
  // Integrated School
  { label: 'IS Sessions',  href: '/is/sessions',        icon: '🏫' },
  { label: 'IS Timetable', href: '/is/timetable',       icon: '⏱' },
]

const HR_NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/hr',         icon: '◈' },
  { label: 'Faculty',    href: '/hr/faculty', icon: '👥' },
  { label: 'Salary',     href: '/hr/salary',  icon: '₹' },
  { label: 'Reports',    href: '/hr/reports', icon: '📊' },
]

// ACADEMICS_MANAGER: Repeaters/DOPA sessions only — no IS sections
const ACADEMICS_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/academics',           icon: '◈' },
  { label: 'Sessions',    href: '/academics/sessions',  icon: '📅' },
  { label: 'Chapters',    href: '/academics/chapters',  icon: '📚' },
  { label: 'Schedule',    href: '/academics/schedule',  icon: '🗓' },
  { label: 'Exam Topics', href: '/academics/exams',     icon: '📝' },
  { label: 'Reports',     href: '/academics/reports',   icon: '📊' },
]

// IS_ACADEMICS_MANAGER: Integrated School only — no Repeaters sections
const IS_ACADEMICS_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/is',           icon: '◈' },
  { label: 'IS Sessions', href: '/is/sessions',  icon: '📅' },
  { label: 'IS Timetable',href: '/is/timetable', icon: '⏱' },
]

// COORDINATOR: Session logging + Chapter progress view
const _coordToken = process.env.NEXT_PUBLIC_COORDINATOR_TOKEN ?? ''
const COORDINATOR_NAV: NavItem[] = [
  { label: 'Log Session', href: `/c/${_coordToken}`,    icon: '📝' },
  { label: 'Chapters',    href: '/academics/chapters',  icon: '📚' },
]

const FACULTY_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/faculty',          icon: '◈' },
  { label: 'My Sessions', href: '/faculty/sessions', icon: '📅' },
  { label: 'My Salary',   href: '/faculty/salary',   icon: '₹' },
]

function navForRole(role: string | null): NavItem[] {
  if (role === 'ADMIN')                                           return ADMIN_NAV
  if (role === 'HR_MANAGER')                                      return HR_NAV
  if (role === 'ACADEMICS_MANAGER')                               return ACADEMICS_NAV
  if (role === 'IS_ACADEMICS_MANAGER' || role === 'IS_COORDINATOR') return IS_ACADEMICS_NAV
  if (role === 'COORDINATOR')                                     return COORDINATOR_NAV
  if (role === 'FACULTY')                                         return FACULTY_NAV
  return []
}

function roleLabel(role: string | null): string {
  if (!role) return ''
  const map: Record<string, string> = {
    ADMIN:                'Admin',
    HR_MANAGER:           'HR Manager',
    ACADEMICS_MANAGER:    'Academics',
    IS_ACADEMICS_MANAGER: 'IS Academics',
    COORDINATOR:          'Coordinator',
    IS_COORDINATOR:       'IS Coordinator',
    FACULTY:              'Faculty',
  }
  return map[role] ?? role.replace(/_/g, ' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { role, accessToken } = useAppSelector((s) => s.auth)
  const nav = navForRole(role)

  const [showChangePwd, setShowChangePwd] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  async function handleLogout() {
    try { await logout(accessToken!) } catch {}
    dispatch(clearCredentials())
    // ADMIN has a separate login portal — send them back there, not the staff login page
    router.push(role === 'ADMIN' ? '/admin/login' : '/login')
  }

  async function handleChangePassword() {
    setPwdError('')
    if (!pwdForm.current) { setPwdError('Enter your current password'); return }
    if (pwdForm.next.length < 6) { setPwdError('New password must be at least 6 characters'); return }
    if (pwdForm.next !== pwdForm.confirm) { setPwdError('Passwords do not match'); return }
    if (!accessToken) return
    setPwdSaving(true)
    try {
      await changePassword(pwdForm.current, pwdForm.next, accessToken)
      setPwdSuccess(true)
      setTimeout(() => {
        setShowChangePwd(false)
        setPwdSuccess(false)
        setPwdForm({ current: '', next: '', confirm: '' })
      }, 1800)
    } catch (e: unknown) {
      setPwdError(e instanceof Error ? e.message : 'Failed to change password')
    } finally { setPwdSaving(false) }
  }

  function closePwdModal() {
    setShowChangePwd(false)
    setPwdForm({ current: '', next: '', confirm: '' })
    setPwdError('')
    setPwdSuccess(false)
  }

  return (
    <>
      <aside style={{
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #3730a3 0%, #4f46e5 40%, #6366f1 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        boxShadow: '2px 0 20px rgba(79,70,229,.25)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo / Brand */}
        <div style={{
          padding: '1.5rem 1.25rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,.12)',
          marginBottom: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'rgba(255,255,255,.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,.25)',
              overflow: 'hidden',
            }}>
              <Image src="/DOPA-Logo.png" alt="DOPA" width={34} height={34} style={{ objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.01em', color: '#fff' }}>
                DOPA FMS
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,.6)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {roleLabel(role)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', overflowY: 'auto' }}>
          {nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.575rem 0.875rem',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                textDecoration: 'none',
                borderRadius: '0.625rem',
                color: isActive ? '#fff' : 'rgba(255,255,255,.72)',
                background: isActive ? 'rgba(255,255,255,.18)' : 'transparent',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}>
                {isActive && (
                  <span style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: '60%', borderRadius: '0 3px 3px 0',
                    background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,.7)',
                  }} />
                )}
                <span style={{ fontSize: '1rem', width: '1.25rem', textAlign: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '0.875rem 0.75rem', borderTop: '1px solid rgba(255,255,255,.12)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <button
            onClick={() => setShowChangePwd(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.6rem 0.875rem', borderRadius: '0.625rem',
              background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
              color: 'rgba(255,255,255,.65)', fontSize: '0.8125rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.9)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.65)' }}
          >
            <span style={{ fontSize: '0.9rem' }}>🔑</span>
            Change Password
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.6rem 0.875rem', borderRadius: '0.625rem',
              background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)',
              color: 'rgba(255,255,255,.8)', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.2)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = 'rgba(255,255,255,.8)' }}
          >
            <span style={{ fontSize: '1rem' }}>⎋</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showChangePwd && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 400,
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, margin: 0, fontSize: '1.0625rem' }}>Change Password</h2>
              <button onClick={closePwdModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-muted)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {pwdSuccess ? (
                <div className="alert alert-success"><span className="alert-icon">✅</span>Password changed successfully!</div>
              ) : (
                <>
                  {pwdError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{pwdError}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { key: 'current', label: 'Current Password', auto: 'current-password' },
                      { key: 'next',    label: 'New Password',     auto: 'new-password' },
                      { key: 'confirm', label: 'Confirm New Password', auto: 'new-password' },
                    ].map(({ key, label, auto }) => (
                      <div key={key} className="form-group">
                        <label className="label">{label}</label>
                        <input
                          type="password"
                          className="input"
                          value={pwdForm[key as keyof typeof pwdForm]}
                          onChange={(e) => setPwdForm({ ...pwdForm, [key]: e.target.value })}
                          placeholder={key === 'next' ? 'At least 6 characters' : ''}
                          autoComplete={auto}
                          onKeyDown={key === 'confirm' ? (e) => { if (e.key === 'Enter') handleChangePassword() } : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {!pwdSuccess && (
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={closePwdModal}>Cancel</button>
                <button className="btn btn-primary" onClick={handleChangePassword} disabled={pwdSaving}>
                  {pwdSaving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Change Password'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
