'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import Shell from '@/components/ui/Shell'

/**
 * Guard layout for the admin section.
 *
 * – Not authenticated at all      → /admin/login  (handled by Shell's loginPath)
 * – Authenticated but NOT ADMIN   → /login         (wrong portal)
 * – Authenticated as ADMIN        → render Shell
 *
 * Shell is told to redirect to /admin/login (not /login) so that
 * admins are never sent to the regular staff login page.
 */
export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const router = useRouter()

  useEffect(() => {
    // Only redirect for wrong role when a token is confirmed present.
    // When accessToken is null on page reload, Shell handles the silent refresh
    // and will redirect to /admin/login if the refresh fails — no double-redirect.
    if (accessToken && role !== 'ADMIN') {
      router.replace('/login')
    }
  }, [accessToken, role, router])

  // Block content if authenticated but wrong role.
  // If accessToken is null, Shell renders null while refreshing — no flash.
  if (accessToken && role !== 'ADMIN') return null

  return <Shell loginPath="/admin/login">{children}</Shell>
}
