'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import Shell from '@/components/ui/Shell'

const ALLOWED_ROLES = ['HR_MANAGER', 'ADMIN']

const ROLE_HOMES: Record<string, string> = {
  ADMIN: '/admin',
  HR_MANAGER: '/hr',
  ACADEMICS_MANAGER: '/academics',
  IG_ACADEMICS_MANAGER: '/ig',
  IG_COORDINATOR: '/ig',
  COORDINATOR: '/coordinator',
  FACULTY: '/faculty',
}

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const router = useRouter()

  useEffect(() => {
    if (accessToken && (!role || !ALLOWED_ROLES.includes(role))) {
      const home = role ? ROLE_HOMES[role] : '/login'
      router.replace(home || '/login')
    }
  }, [accessToken, role, router])

  if (accessToken && (!role || !ALLOWED_ROLES.includes(role))) return null

  return <Shell>{children}</Shell>
}

