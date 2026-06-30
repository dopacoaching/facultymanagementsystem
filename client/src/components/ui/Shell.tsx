'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { refresh } from '@/services/auth.service'
import { useTheme } from '@/hooks/useTheme'
import Sidebar from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/coordinator':         'Log Session',
    '/admin':               'Admin Dashboard',
    '/admin/audit-log':     'Audit Log',
    '/admin/users':         'User Management',
    '/hr':                  'HR Dashboard',
    '/hr/faculty':          'Faculty',
    '/hr/salary':           'Salary Calculator',
    '/hr/reports':          'Salary Reports',
    '/academics':                'Academics Dashboard',
    '/academics/sessions':       'Sessions',
    '/academics/availability':   'Faculty Availability',
    '/academics/chapters':       'Chapter Progress',
    '/academics/schedule':       'Weekly Schedule',
    '/academics/reports':        'Academics Reports',
    '/ig':                  'IG Dashboard',
    '/ig/timetable':        'IG Daily Timetable',
    '/ig/sessions':         'IG Sessions',
    '/ig/chapters':         'IG Chapter Progress',
    '/faculty':             'Faculty Dashboard',
    '/faculty/sessions':    'My Sessions',
    '/faculty/salary':      'My Salary',
  }
  if (map[pathname]) return map[pathname]
  const prefix = Object.keys(map)
    .filter((k) => pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return prefix ? map[prefix] : 'Dashboard'
}

interface ShellProps {
  children: React.ReactNode
  loginPath?: string
}

export default function Shell({ children, loginPath = '/login' }: ShellProps) {
  const { accessToken, role, userId, facultyId, batchId, batchType } = useAppSelector((s) => s.auth)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()
  const [, setRefreshing] = useState(!accessToken)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    if (accessToken) { setRefreshing(false); return }
    let cancelled = false
    refresh()
      .then(({ accessToken: newToken }) => {
        if (cancelled) return
        dispatch(setCredentials({
          accessToken: newToken,
          role:        role      ?? null,
          userId:      userId    ?? null,
          facultyId:   facultyId ?? null,
          batchId:     batchId   ?? null,
          batchType:   batchType ?? null,
        }))
      })
      .catch(() => { if (!cancelled) router.replace(loginPath) })
      .finally(() => { if (!cancelled) setRefreshing(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close sidebar on route change (mobile nav)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  if (!accessToken) return null

  const pageTitle = getPageTitle(pathname)

  return (
    <div className="shell-layout">
      {/* Keyboard users can jump straight past the sidebar/topbar */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="shell-main">
        {/* Top bar */}
        <header className="shell-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Hamburger — mobile only */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span /><span /><span />
            </button>
            <h1 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {pageTitle}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span className="role-chip">
              {role?.replace(/_/g, ' ') ?? 'User'}
            </span>
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34,
                borderRadius: '50%',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'background 0.2s, border-color 0.2s',
                flexShrink: 0,
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="shell-content" tabIndex={-1}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
