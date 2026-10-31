'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import Shell from '@/components/ui/Shell'
import { ROLE_HOME } from '@/lib/roleHome'

/** Repeaters joint class entry — only the dedicated joint-entry login may use it. */
const ALLOWED_ROLES = ['REPEATERS_JOINT_TEACHER']

export default function JointEntryLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, role } = useAppSelector((s) => s.auth)
  const router = useRouter()

  useEffect(() => {
    if (accessToken && (!role || !ALLOWED_ROLES.includes(role))) {
      router.replace((role && ROLE_HOME[role]) || '/login')
    }
  }, [accessToken, role, router])

  if (accessToken && (!role || !ALLOWED_ROLES.includes(role))) return null

  return <Shell>{children}</Shell>
}
