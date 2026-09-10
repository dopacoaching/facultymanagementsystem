'use client'
import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials, clearCredentials } from '@/store/slices/authSlice'
import { logout } from '@/services/auth.service'
import { roleHomePath } from '@/lib/roleHome'

/**
 * Shared client-side SSO bridge.
 *
 * The identity portal redirects the browser to `/sso?code=…` (staff) or
 * `/admin/sso?code=…` (admin). Those are *pages* rather than bare API redirects
 * because FMS only re-derives a session on mount when Redux already carries a
 * `role` (see components/ui/Providers.tsx) — a cookie alone would bounce a
 * fresh SSO'd-in user straight back to /login. This hook POSTs the code to
 * `/api/auth/sso`, then seeds Redux with the exact same `setCredentials(…)`
 * payload the password-login pages use, so nothing downstream can tell the
 * difference between an SSO login and a normal one.
 */
interface SsoBridgeOptions {
  /** Where to send the browser on any failure or role mismatch. */
  loginPath: string
  /**
   * `true`  → only an ADMIN token may complete this bridge (admin portal callback).
   * `false` → any role *except* ADMIN may complete it (staff portal callback).
   * A mismatch clears the cookie the route just set and redirects to `loginPath`.
   */
  requireAdmin: boolean
  /** Fixed landing path; when omitted, the per-role home ({@link roleHomePath}) is used. */
  landingPath?: string
}

export function useSsoBridge({ loginPath, requireAdmin, landingPath }: SsoBridgeOptions) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const searchParams = useSearchParams()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const code = searchParams.get('code')
    if (!code) {
      router.replace(loginPath)
      return
    }

    ;(async () => {
      try {
        const res = await fetch('/api/auth/sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        if (!res.ok) {
          router.replace(loginPath)
          return
        }
        const data = await res.json()

        // Wrong portal for this token's role — don't leave the just-set
        // refreshToken cookie lingering on the device.
        if ((data.role === 'ADMIN') !== requireAdmin) {
          try { await logout() } catch {}
          dispatch(clearCredentials())
          router.replace(loginPath)
          return
        }

        dispatch(setCredentials({
          accessToken: data.accessToken,
          role:        data.role,
          userId:      data.userId,
          facultyId:   data.facultyId  ?? null,
          batchId:     data.batchId    ?? null,
          batchType:   data.batchType  ?? null,
          campusName:  data.campusName ?? null,
          campusId:    data.campusId   ?? null,
        }))
        router.replace(landingPath ?? roleHomePath(data.role))
      } catch {
        router.replace(loginPath)
      }
    })()
  }, [dispatch, router, searchParams, loginPath, requireAdmin, landingPath])
}
