'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import Shell from '@/components/ui/Shell'
import { ROLE_HOME } from '@/lib/roleHome'
import { JOINT_ENTRY_CAMPUS_LOGINS } from '@/lib/constants/jointCampuses'

/** Repeaters joint class entry — the dedicated joint-entry login, and Studio's campus login. The API is authoritative. */
function allowed(role: string | null, campusName: string | null): boolean {
  return role === 'REPEATERS_JOINT_TEACHER'
    || (role === 'CLASS_TEACHER' && !!campusName && (JOINT_ENTRY_CAMPUS_LOGINS as readonly string[]).includes(campusName))
}

export default function JointEntryLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, role, campusName } = useAppSelector((s) => s.auth)
  const router = useRouter()

  useEffect(() => {
    if (accessToken && !allowed(role, campusName)) {
      router.replace((role && ROLE_HOME[role]) || '/login')
    }
  }, [accessToken, role, campusName, router])

  if (accessToken && !allowed(role, campusName)) return null

  return <Shell>{children}</Shell>
}
