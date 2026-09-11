'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCredentials } from '@/store/slices/authSlice'
import { logout, changePassword } from '@/services/auth.service'
import { SCHEDULING_ENABLED } from '@/lib/featureFlags'
import { getRouteMeta, navLabelFor, type Role } from '@/lib/routeMeta'
import PasswordInput from './PasswordInput'
import { FormField } from './FormField'
import { Modal } from './Modal'

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

// ─── Role navigation ──────────────────────────────────────────────────────────
// Each role's sidebar is a hand-curated list of section markers + route paths.
// Labels, titles and feature-flag gating come from `routeMeta` so nothing can
// drift out of sync. Routes deliberately kept out of the sidebar (secondary
// academics screens, faculty schedule, etc.) are reached from in-page links.

type NavEntry = { section: string } | { href: string }

// The Weekly Schedule editor (Repeaters + IG) — shown to ADMIN and both
// academics-manager roles; each manager is scoped server-side to their own
// batch type (Repeaters or IG).
const SCHEDULING_ENTRY: NavEntry[] = SCHEDULING_ENABLED ? [{ href: '/scheduling' }] : []

const ROLE_NAV: Record<string, NavEntry[]> = {
  ADMIN: [
    { href: '/admin' },
    { section: 'System' },
    { href: '/admin/users' },
    { href: '/admin/audit-log' },
    { section: 'HR' },
    { href: '/hr/faculty' },
    { href: '/hr/salary' },
    { href: '/hr/reports' },
    { href: '/hr/reports/faculty-hours' },
    { href: '/hr/reports/class-sessions' },
    { href: '/hr/reports/ig-sessions' },
    { section: 'Academics' },
    { href: '/academics/sessions' },
    ...SCHEDULING_ENTRY,
  ],
  HR_MANAGER: [
    { href: '/hr' },
    { href: '/hr/faculty' },
    { href: '/hr/salary' },
    { href: '/hr/reports' },
    { href: '/hr/reports/faculty-hours' },
    { href: '/hr/reports/class-sessions' },
    { href: '/hr/reports/ig-sessions' },
  ],
  ACADEMICS_MANAGER: [
    { href: '/academics' },
    { href: '/academics/sessions' },
    ...SCHEDULING_ENTRY,
  ],
  IG_ACADEMICS_MANAGER: [
    { href: '/ig' },
    { href: '/ig/sessions' },
    { href: '/ig/timetable' },
    { href: '/ig/chapters' },
    ...SCHEDULING_ENTRY,
  ],
  CLASS_TEACHER: [
    { href: '/coordinator' },
    { href: '/coordinator/history' },
  ],
  IG_CLASS_TEACHER: [
    { href: '/ig/sessions' },
    { href: '/ig/sessions/history' },
  ],
  FACULTY: [
    { href: '/faculty' },
    { href: '/faculty/sessions' },
    { href: '/faculty/salary' },
  ],
}

function navForRole(role: string | null): NavEntry[] {
  return (role && ROLE_NAV[role]) || []
}

function roleLabel(role: string | null): string {
  if (!role) return ''
  const map: Record<string, string> = {
    ADMIN:                'Admin',
    HR_MANAGER:           'HR Manager',
    ACADEMICS_MANAGER:    'Academics',
    IG_ACADEMICS_MANAGER: 'IG Academics',
    CLASS_TEACHER:        'Class Teacher',
    IG_CLASS_TEACHER:     'IG Class Teacher',
    FACULTY:              'Faculty',
  }
  return map[role] ?? role.replace(/_/g, ' ')
}

/** Short 1–2 char monogram for the collapsed rail (icon-less rail by design). */
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
  const entries = navForRole(role)
  const linkPaths = entries
    .filter((e): e is { href: string } => 'href' in e)
    .map((e) => e.href)

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

  const [loggingOut, setLoggingOut] = useState(false)
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try { await logout(accessToken!) } catch {}
    dispatch(clearCredentials())
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
        <button
          type="button"
          className="rail-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '›' : '‹'}
        </button>

        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <Image src="/logo.png" alt="" width={28} height={28} style={{ objectFit: 'contain' }} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">DOPA FMS</span>
            <span className="sidebar-brand-role">{roleLabel(role)}</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">×</button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {entries.map((entry, idx) => {
            if ('section' in entry) {
              return <div key={`section-${idx}`} className="nav-section">{entry.section}</div>
            }
            const meta = getRouteMeta(entry.href)
            const label = meta ? navLabelFor(meta, role as Role) : entry.href
            // Active when exact, or a descendant that has no nearer sidebar entry.
            const hasNearerChild = linkPaths.some(
              (p) => p !== entry.href && p.startsWith(entry.href + '/'),
            )
            const isActive =
              pathname === entry.href ||
              (!hasNearerChild && pathname.startsWith(entry.href + '/'))
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`nav-link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={label}
              >
                <span aria-hidden="true" className="rail-mono">{monogram(label)}</span>
                <span className="rail-label">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-action"
            onClick={() => setShowChangePwd(true)}
            title="Change password"
          >
            <span aria-hidden="true" className="rail-mono">PW</span>
            <span className="rail-label">Change password</span>
          </button>

          <button
            type="button"
            className="sidebar-action"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out"
          >
            <span aria-hidden="true" className="rail-mono">SO</span>
            <span className="rail-label">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      <Modal
        open={showChangePwd}
        onClose={closePwdModal}
        title="Change password"
        footer={!pwdSuccess && (
          <>
            <button type="button" className="btn btn-ghost" onClick={closePwdModal}>Cancel</button>
            <button type="submit" form="change-pwd-form" className="btn btn-primary" disabled={pwdSaving}>
              {pwdSaving ? <><span className="spinner spinner-on-solid" /> Saving…</> : 'Change password'}
            </button>
          </>
        )}
      >
        {pwdSuccess ? (
          <div className="alert alert-success"><span className="alert-icon" aria-hidden="true">✓</span>Password changed successfully.</div>
        ) : (
          <form id="change-pwd-form" onSubmit={(e) => { e.preventDefault(); handleChangePassword() }}>
            {pwdError && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
                <span className="alert-icon" aria-hidden="true">!</span>{pwdError}
              </div>
            )}
            <div className="form-stack">
              <FormField label="Current password" htmlFor="pwd-current">
                <input
                  id="pwd-current"
                  type="password"
                  className="input"
                  autoFocus
                  value={pwdForm.current}
                  onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                  autoComplete="current-password"
                />
              </FormField>

              <FormField
                label="New password"
                htmlFor="pwd-next"
                hint="8+ characters, with an uppercase letter, a lowercase letter, a digit and a symbol."
              >
                <PasswordInput
                  id="pwd-next"
                  value={pwdForm.next}
                  onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                  autoComplete="new-password"
                />
              </FormField>

              <FormField label="Confirm new password" htmlFor="pwd-confirm">
                <input
                  id="pwd-confirm"
                  type="password"
                  className="input"
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                  autoComplete="new-password"
                />
              </FormField>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
