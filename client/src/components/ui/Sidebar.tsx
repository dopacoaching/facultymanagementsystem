'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCredentials } from '@/store/slices/authSlice'
import { logout, changePassword } from '@/services/auth.service'
import PasswordInput from './PasswordInput'
import { SCHEDULING_ENABLED } from '@/lib/featureFlags'

/** Weekly Scheduling nav entry — dev-only until the feature flag is enabled. */
const SCHEDULING_NAV: NavItem[] = SCHEDULING_ENABLED
  ? [{ label: 'Weekly Schedule', href: '/scheduling', icon: '' }]
  : []

/** Mirror of the server validatePasswordComplexity rule. */
function validatePasswordComplexity(pw: string): string | null {
  if (!pw || pw.length < 8)  return 'Password must be at least 8 characters'
  if (pw.length > 64)         return 'Password must be at most 64 characters'
  if (!/[A-Z]/.test(pw))     return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(pw))     return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(pw))     return 'Password must contain at least one digit'
  if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw))
    return 'Password must contain at least one special character (!@#$%^&* etc.)'
  return null
}

type NavItem =
  | { type?: 'link'; label: string; href: string; icon: string }
  | { type: 'section'; label: string }

// ─── Role navs ────────────────────────────────────────────────────────────────

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/admin',           icon: '◈' },
  { type: 'section', label: 'System' },
  { label: 'Users',       href: '/admin/users',     icon: '🔐' },
  { label: 'Audit Log',   href: '/admin/audit-log', icon: '📋' },
  { type: 'section', label: 'HR' },
  { label: 'Faculty',     href: '/hr/faculty',      icon: '👥' },
  { label: 'Salary',      href: '/hr/salary',       icon: '₹'  },
  { label: 'Reports',     href: '/hr/reports',      icon: '📊' },
  { label: 'Faculty Hours', href: '/hr/reports/faculty-hours', icon: '📈' },
  { label: 'Class Sessions', href: '/hr/reports/class-sessions', icon: '📝' },
  { label: 'IG Class Sessions', href: '/hr/reports/ig-sessions', icon: '📝' },
  { type: 'section', label: 'Academics' },
  { label: 'Sessions',     href: '/academics/sessions',          icon: '📅' },
  ...SCHEDULING_NAV,
]

const HR_NAV: NavItem[] = [
  { label: 'Dashboard',      href: '/hr',                    icon: '◈' },
  { label: 'Faculty',        href: '/hr/faculty',             icon: '👥' },
  { label: 'Salary',         href: '/hr/salary',              icon: '₹' },
  { label: 'Reports',        href: '/hr/reports',             icon: '📊' },
  { label: 'Faculty Hours',  href: '/hr/reports/faculty-hours', icon: '📈' },
  { label: 'Class Sessions', href: '/hr/reports/class-sessions', icon: '📝' },
  { label: 'IG Class Sessions', href: '/hr/reports/ig-sessions', icon: '📝' },
]

// ACADEMICS_MANAGER: Repeaters/DOPA sessions only — no IS sections
const ACADEMICS_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/academics',                    icon: '◈' },
  { label: 'Sessions',     href: '/academics/sessions',           icon: '📅' },
  ...SCHEDULING_NAV,
]

// IG_ACADEMICS_MANAGER: IG (Integrated Grades) only — no Repeaters sections
const IS_ACADEMICS_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/ig',           icon: '◈' },
  { label: 'IG Sessions', href: '/ig/sessions',  icon: '📅' },
  { label: 'IG Timetable',href: '/ig/timetable', icon: '⏱' },
  { label: 'IG Chapters', href: '/ig/chapters',  icon: '📖' },
  ...SCHEDULING_NAV,
]

// CLASS_TEACHER (Class Teacher): Session/hours logging only
const COORDINATOR_NAV: NavItem[] = [
  { label: 'Log Session', href: '/coordinator',         icon: '📝' },
  { label: 'History',     href: '/coordinator/history', icon: '📜' },
]

// IG_CLASS_TEACHER: Session logging only — same minimal shape as COORDINATOR_NAV
const IG_CLASS_TEACHER_NAV: NavItem[] = [
  { label: 'Log Session', href: '/ig/sessions',         icon: '📝' },
  { label: 'History',     href: '/ig/sessions/history', icon: '📜' },
]

const FACULTY_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/faculty',          icon: '◈' },
  { label: 'My Sessions', href: '/faculty/sessions', icon: '📅' },
  { label: 'My Salary',   href: '/faculty/salary',   icon: '₹' },
]

function navForRole(role: string | null): NavItem[] {
  if (role === 'ADMIN')               return ADMIN_NAV
  if (role === 'HR_MANAGER')          return HR_NAV
  if (role === 'ACADEMICS_MANAGER')   return ACADEMICS_NAV
  if (role === 'IG_ACADEMICS_MANAGER') return IS_ACADEMICS_NAV
  if (role === 'IG_CLASS_TEACHER')      return IG_CLASS_TEACHER_NAV
  if (role === 'CLASS_TEACHER')         return COORDINATOR_NAV
  if (role === 'FACULTY')             return FACULTY_NAV
  return []
}

function roleLabel(role: string | null): string {
  if (!role) return ''
  const map: Record<string, string> = {
    ADMIN:                'Admin',
    HR_MANAGER:           'HR Manager',
    ACADEMICS_MANAGER:    'Academics',
    IG_ACADEMICS_MANAGER: 'IG Academics',
    CLASS_TEACHER:          'Class Teacher',
    IG_CLASS_TEACHER:       'IG Class Teacher',
    FACULTY:              'Faculty',
  }
  return map[role] ?? role.replace(/_/g, ' ')
}

/** Short 1–2 char monogram for the collapsed rail (no icons). */
function monogram(label: string): string {
  const words = label.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return label.slice(0, 2).toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { role, accessToken } = useAppSelector((s) => s.auth)
  const nav = navForRole(role)

  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('railCollapsed') === '1') } catch {}
  }, [])
  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem('railCollapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

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
    const complexityError = validatePasswordComplexity(pwdForm.next)
    if (complexityError) { setPwdError(complexityError); return }
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
      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}${collapsed ? ' is-collapsed' : ''}`}>
        {/* Desktop collapse toggle */}
        <button
          type="button"
          className="rail-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '›' : '‹'}
        </button>

        {/* Logo / Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <Image src="/logo.png" alt="DOPA" width={28} height={28} style={{ objectFit: 'contain' }} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">DOPA FMS</span>
            <span className="sidebar-brand-role">{roleLabel(role)}</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >×</button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {nav.map((item, idx) => {
            if (item.type === 'section') {
              return (
                <div key={`section-${idx}`} className="nav-section">
                  {item.label}
                </div>
              )
            }
            const linkItem = item as { label: string; href: string; icon: string }
            const links = nav.filter((n): n is { label: string; href: string; icon: string } => n.type !== 'section')
            const hasChild = links.some((other) => other.href !== linkItem.href && other.href.startsWith(linkItem.href + '/'))
            const isActive = pathname === linkItem.href || (!hasChild && pathname.startsWith(linkItem.href + '/'))
            return (
              <Link
                key={linkItem.href}
                href={linkItem.href}
                className={`nav-link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={linkItem.label}
              >
                <span aria-hidden="true" className="rail-mono">{monogram(linkItem.label)}</span>
                <span className="rail-label">{linkItem.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-action"
            onClick={() => setShowChangePwd(true)}
            title="Change Password"
          >
            <span aria-hidden="true" className="rail-mono">PW</span>
            <span className="rail-label">Change Password</span>
          </button>

          <button
            type="button"
            className="sidebar-action"
            onClick={handleLogout}
            title="Sign Out"
          >
            <span aria-hidden="true" className="rail-mono">⇥</span>
            <span className="rail-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showChangePwd && (
        <div
          role="dialog" aria-modal="true" aria-label="Change Password"
          className="modal-backdrop"
          onKeyDown={(e) => { if (e.key === 'Escape') closePwdModal() }}
        >
          <div className="modal-panel">
            <div className="modal-header">
              <h2>Change Password</h2>
              <button onClick={closePwdModal} aria-label="Close" className="modal-close">×</button>
            </div>
            <div className="modal-body">
              {pwdSuccess ? (
                <div className="alert alert-success"><span className="alert-icon">✅</span>Password changed successfully!</div>
              ) : (
                <>
                  {pwdError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><span className="alert-icon">⚠</span>{pwdError}</div>}
                  <div className="form-stack">
                    {/* Current password — plain input (no strength bar needed) */}
                    <div className="form-group">
                      <label className="label">Current Password</label>
                      <input
                        type="password"
                        className="input"
                        autoFocus
                        value={pwdForm.current}
                        onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                        autoComplete="current-password"
                      />
                    </div>

                    {/* New password — PasswordInput with strength bar */}
                    <div className="form-group">
                      <label className="label">New Password</label>
                      <PasswordInput
                        value={pwdForm.next}
                        onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                        autoComplete="new-password"
                        placeholder="8+ chars · upper · lower · digit · symbol"
                      />
                    </div>

                    {/* Confirm — plain input */}
                    <div className="form-group">
                      <label className="label">Confirm New Password</label>
                      <input
                        type="password"
                        className="input"
                        value={pwdForm.confirm}
                        onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                        autoComplete="new-password"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            {!pwdSuccess && (
              <div className="modal-footer">
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
