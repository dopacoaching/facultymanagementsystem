'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Audit log has moved to the admin portal.
 * HR users who visit this stale URL are redirected to their dashboard.
 */
export default function HRAuditLogRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/hr') }, [router])
  return null
}
