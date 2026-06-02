'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { refresh } from '@/services/auth.service'
import Sidebar from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'

/** Map URL segments to human-readable page titles */
function getPageTitle(pathname: string): string {
  // Secret coordinator route: /c/<token>
  if (pathname.startsWith('/c/')) return 'Log Session'

  const map: Record<string, string> = {
    '/admin':               'Admin Dashboard',
    '/admin/audit-log':     'Audit Log',
    '/admin/users':         'User Management',
    '/hr':                  'HR Dashboard',
    '/hr/faculty':          'Faculty',
    '/hr/salary':           'Salary Calculator',
    '/hr/reports':          'Salary Reports',
    '/academics':           'Academics Dashboard',
    '/academics/sessions':  'Sessions',
    '/academics/chapters':  'Chapter Progress',
    '/academics/schedule':  'Weekly Schedule',
    '/academics/exams':     'Exam Topics',
    '/academics/reports':   'Academics Reports',
    '/is':                  'IS Dashboard',
    '/is/timetable':        'IS Daily Timetable',
    '/is/sessions':         'IS Sessions',
    '/is/chapters':         'IS Chapter Progress',
    '/faculty':             'Faculty Dashboard',
    '/faculty/sessions':    'My Sessions',
    '/faculty/salary':      'My Salary',
  }
  if (map[pathname]) return map[pathname]
  // Prefix match (longest first)
  const prefix = Object.keys(map)
    .filter((k) => pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return prefix ? map[prefix] : 'Dashboard'
}

interface ShellProps {
  children: React.ReactNode
  /** Where to redirect when there is no valid session. Defaults to '/login'. */
  loginPath?: string
}

export default function Shell({ children, loginPath = '/login' }: ShellProps) {
  const { accessToken, role, userId, facultyId, batchId } = useAppSelector((s) => s.auth)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()
  // true while a silent refresh is in-flight (prevents premature login redirect)
  const [refreshing, setRefreshing] = useState(!accessToken)

  useEffect(() => {
    if (accessToken) {
      setRefreshing(false)
      return
    }
    // accessToken was stripped from localStorage on page reload — attempt a
    // silent refresh via the httpOnly cookie before redirecting to login.
    let cancelled = false
    refresh()
      .then(({ accessToken: newToken }) => {
        if (cancelled) return
        dispatch(setCredentials({
          accessToken: newToken,
          role: role ?? null,
          userId: userId ?? null,
          facultyId: facultyId ?? null,
          batchId: batchId ?? null,
        }))
      })
      .catch(() => {
        if (!cancelled) router.replace(loginPath)
      })
      .finally(() => { if (!cancelled) setRefreshing(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Don't flash protected content while refreshing or redirecting.
  if (!accessToken) return null

  const pageTitle = getPageTitle(pathname)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Sidebar />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: 'var(--topbar-height)',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.75rem',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,.04)',
          position: 'sticky',
          top: 0,
          zIndex: 9,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{
              fontSize: '1.0625rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: 0,
            }}>
              {pageTitle}
            </h1>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
          }}>
            {/* Role chip */}
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
              background: 'rgba(79,70,229,.08)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              border: '1px solid rgba(79,70,229,.15)',
            }}>
              {role?.replace(/_/g, ' ') ?? 'User'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          padding: '1.75rem 2rem',
          overflowY: 'auto',
        }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
