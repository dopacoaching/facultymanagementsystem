'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import Shell from '@/components/ui/Shell'
import { SCHEDULING_ENABLED } from '@/lib/featureFlags'

// The Weekly Schedule editor covers both Repeaters and IG batches. ADMIN sees
// everything; each academics-manager role is scoped server-side (API routes)
// to their own batch type.
const ALLOWED_ROLES = ['ADMIN', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER']

const ROLE_HOMES: Record<string, string> = {
  ADMIN: '/admin',
  HR_MANAGER: '/hr',
  ACADEMICS_MANAGER: '/academics',
  IG_ACADEMICS_MANAGER: '/ig',
  IG_CLASS_TEACHER: '/ig/sessions',
  CLASS_TEACHER: '/coordinator',
  FACULTY: '/faculty',
}

export default function SchedulingLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const router = useRouter()

  // Dev-only feature: when the flag is off, this route tree does not exist.
  const denied = !SCHEDULING_ENABLED || (!!role && !ALLOWED_ROLES.includes(role))

  useEffect(() => {
    if (accessToken && denied) {
      const home = role ? ROLE_HOMES[role] : '/login'
      router.replace(home || '/login')
    }
  }, [accessToken, role, denied, router])

  if (accessToken && denied) return null

  return <Shell>{children}</Shell>
}
