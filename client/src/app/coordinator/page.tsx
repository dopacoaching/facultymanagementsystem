'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * The old /coordinator route is no longer used.
 * Coordinators access the form via the secret URL: /c/<token>
 * Anyone landing here is redirected to /login.
 */
export default function CoordinatorPageLegacy() {
  const router = useRouter()
  useEffect(() => { router.replace('/login') }, [router])
  return null
}
