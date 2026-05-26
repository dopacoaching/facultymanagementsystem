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
    if (!accessToken) {
      // Not logged in at all — send to the admin login page
      router.replace('/admin/login')
    } else if (role !== 'ADMIN') {
      // Logged in but wrong role — send to regular staff login
      router.replace('/login')
    }
  }, [accessToken, role, router])

  // Don't flash protected content while redirecting
  if (!accessToken || role !== 'ADMIN') return null

  return <Shell loginPath="/admin/login">{children}</Shell>
}
