/**
 * apiFetch — centralised HTTP client with automatic silent token refresh.
 *
 * On any 401 from a non-auth endpoint the interceptor:
 *  1. Reads the response body to check for SESSION_EXPIRED.
 *     - SESSION_EXPIRED → clears Redux + redirects to /login?reason=session_expired
 *       (does NOT attempt a refresh — the session is truly gone)
 *  2. For ordinary 401 (expired JWT, not inactivity):
 *     a. Calls POST /auth/refresh (uses the httpOnly refreshToken cookie)
 *     b. Updates the Redux store with the new access token
 *     c. Retries the original request once with the new token
 *     d. If refresh fails → dispatches clearCredentials() so the Shell redirects to /login
 *
 * On every successful authenticated response the interceptor also reads the
 * X-Refreshed-Token header (set by authenticate() middleware on the server).
 * If present, it silently swaps the stored access token so the sliding 30-minute
 * inactivity window keeps rolling on every API call.
 *
 * Concurrent requests that all 401 at the same time share a single in-flight
 * refresh promise (no thundering-herd of refresh calls).
 */

import { store } from '@/store'
import { setCredentials, clearCredentials, refreshToken as refreshTokenAction } from '@/store/slices/authSlice'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

interface FetchOptions {
  token?: string
  method?: string
  body?: unknown
}

// Shared refresh promise so concurrent 401s don't each fire a separate refresh.
let refreshInFlight: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Refresh failed')

      const { accessToken } = (await res.json()) as { accessToken: string }

      // Re-read the current auth state so we can preserve role/userId/etc.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const auth = (store.getState() as any).auth as {
        role: string | null
        userId: string | null
        facultyId: string | null
        batchId: string | null
      }

      store.dispatch(setCredentials({
        accessToken,
        role: auth.role ?? '',
        userId: auth.userId ?? '',
        facultyId: auth.facultyId,
        batchId: auth.batchId,
      }))

      return accessToken
    } catch {
      // Refresh token is invalid/expired — force the user back to login.
      store.dispatch(clearCredentials())
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

function buildHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

/** Read X-Refreshed-Token and silently update the Redux store if present. */
function absorbRefreshedToken(response: Response): void {
  const refreshed = response.headers.get('X-Refreshed-Token')
  if (refreshed) {
    store.dispatch(refreshTokenAction(refreshed))
  }
}

/** Redirect to login with a reason parameter (replaces current history entry). */
function redirectToLogin(reason: string): void {
  if (typeof window !== 'undefined') {
    // Determine correct login page: admin vs staff
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role = (store.getState() as any).auth?.role as string | null
    const loginPath = role === 'ADMIN' ? '/admin/login' : '/login'
    window.location.replace(`${loginPath}?reason=${reason}`)
  }
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, method = 'GET', body } = opts
  const fetchInit: RequestInit = {
    method,
    headers: buildHeaders(token),
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  const res = await fetch(`${BASE}/api${path}`, fetchInit)

  // ── Sliding-window token refresh ─────────────────────────────────────────
  // On every successful response absorb a refreshed token if the server sent one.
  if (res.ok) {
    absorbRefreshedToken(res)
    return res.json() as Promise<T>
  }

  // ── 401 handling ─────────────────────────────────────────────────────────
  if (res.status === 401 && !path.startsWith('/auth/')) {
    // Read the body once so we can inspect the error code.
    const errBody = await res.json().catch(() => ({ error: '' })) as { error?: string }

    // SESSION_EXPIRED = inactivity timeout — do NOT attempt a refresh.
    if (errBody.error === 'SESSION_EXPIRED') {
      store.dispatch(clearCredentials())
      redirectToLogin('session_expired')
      throw new Error('Your session expired due to inactivity. Please sign in again.')
    }

    // Ordinary token expiry — try a silent refresh.
    const newToken = await tryRefreshToken()

    if (!newToken) {
      // clearCredentials already dispatched; Shell will redirect to /login.
      throw new Error('Session expired. Please sign in again.')
    }

    // Retry the original request with the fresh token.
    const retryRes = await fetch(`${BASE}/api${path}`, {
      ...fetchInit,
      headers: buildHeaders(newToken),
    })

    if (retryRes.ok) {
      absorbRefreshedToken(retryRes)
      return retryRes.json() as Promise<T>
    }

    const err = await retryRes.json().catch(() => ({ error: `HTTP ${retryRes.status}` }))
    throw new Error((err as { error?: string }).error ?? 'Request failed')
  }

  const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  throw new Error((err as { error?: string }).error ?? 'Request failed')
}
