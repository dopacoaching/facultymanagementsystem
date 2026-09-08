'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { useTheme } from '@/hooks/useTheme'
import { getPageTitle, getBreadcrumbs } from '@/lib/routeMeta'
import { restoreSession } from '@/lib/sessionRestore'
import Sidebar from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'

interface ShellProps {
  children: React.ReactNode
  loginPath?: string
}

export default function Shell({ children, loginPath = '/login' }: ShellProps) {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    if (accessToken) return
    let cancelled = false
    // Shared in-flight promise — <Providers/SilentRefresh> may already be
    // running this; both callers await the same request.
    restoreSession().then((outcome) => {
      if (!cancelled && outcome === 'no-session') router.replace(loginPath)
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close sidebar on route change (mobile nav)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const pageTitle = getPageTitle(pathname)
  const crumbs = getBreadcrumbs(pathname)

  // Keep the browser tab title in step with the current route.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = pageTitle === 'DOPA FMS' ? 'DOPA FMS' : `${pageTitle} · DOPA FMS`
    }
  }, [pageTitle])

  // Nothing to show until we either have a token or know there is no session.
  // The silent refresh is a sub-100ms cookie round-trip and the route guards
  // depend on its outcome, so a brief null is preferable to a wrong redirect.
  if (!accessToken) return null

  return (
    <div className="shell-layout">
      {/* Keyboard users can jump straight past the sidebar/topbar */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="shell-topbar-lead">
            <button
              type="button"
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span /><span /><span />
            </button>
            <div className="shell-title-block">
              {crumbs.length > 1 && (
                <nav className="shell-breadcrumbs" aria-label="Breadcrumb">
                  {crumbs.slice(0, -1).map((c) => (
                    <span key={c.path}>
                      <Link href={c.path}>{c.title}</Link>
                      <span aria-hidden="true" className="shell-breadcrumb-sep">/</span>
                    </span>
                  ))}
                </nav>
              )}
              <h1>{pageTitle}</h1>
            </div>
          </div>
          <div className="shell-topbar-actions">
            <span className="role-chip">{role?.replace(/_/g, ' ') ?? 'User'}</span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="theme-toggle"
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main id="main-content" className="shell-content" tabIndex={-1}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
