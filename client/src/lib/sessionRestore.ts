/**
 * restoreSession — single owner of "we have a persisted role but no access
 * token, try the httpOnly refresh cookie".
 *
 * Both <Providers/SilentRefresh> (mounts app-wide, including on the login
 * pages) and <Shell> (mounts inside an authenticated section) need this on
 * first paint. Previously each fired its own POST /api/auth/refresh, so a
 * cold load of an authenticated route sent two identical refresh requests
 * that raced. This module collapses them into one shared in-flight promise
 * and writes the result to Redux exactly once.
 */

import { store } from '@/store'
import { setCredentials, clearCredentials } from '@/store/slices/authSlice'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export type RestoreOutcome = 'restored' | 'no-session' | 'not-needed'

let inFlight: Promise<RestoreOutcome> | null = null

function authState() {
  return (store.getState() as {
    auth: {
      accessToken: string | null; role: string | null; userId: string | null
      facultyId: string | null; batchId: string | null; batchType: string | null
      campusName: string | null; campusId: string | null
    }
  }).auth
}

/**
 * Attempt to restore the session. Safe to call from multiple components on the
 * same tick — they all await the same request.
 *
 * - Returns 'not-needed' when there is already a token, or no persisted role.
 * - Returns 'restored' when the refresh cookie produced a fresh access token.
 * - Returns 'no-session' when there is a persisted role but the refresh failed
 *   (credentials are cleared so route guards can redirect to login).
 */
export function restoreSession(): Promise<RestoreOutcome> {
  const { accessToken, role } = authState()
  if (accessToken) return Promise.resolve('not-needed')
  if (!role) return Promise.resolve('not-needed')

  if (inFlight) return inFlight

  inFlight = (async (): Promise<RestoreOutcome> => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        store.dispatch(clearCredentials())
        return 'no-session'
      }
      const { accessToken: newToken } = (await res.json()) as { accessToken: string }
      const s = authState()
      store.dispatch(setCredentials({
        accessToken: newToken,
        role:        s.role       ?? null,
        userId:      s.userId     ?? null,
        facultyId:   s.facultyId  ?? null,
        batchId:     s.batchId    ?? null,
        batchType:   s.batchType  ?? null,
        campusName:  s.campusName ?? null,
        campusId:    s.campusId   ?? null,
      }))
      return 'restored'
    } catch {
      store.dispatch(clearCredentials())
      return 'no-session'
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
