/**
 * apiFetch — centralised HTTP client with automatic silent token refresh.
 *
 * Token lifecycle
 * ──────────────
 * • Login / explicit logout update Redux (accessToken) — this is what the
 *   Shell UI reads to decide whether to show authenticated content.
 *
 * • Every successful authenticated response carries an X-Refreshed-Token header
 *   that re-signs the access token with a fresh `lastActive` timestamp, extending
 *   the 30-minute inactivity window.  We store this in a module-level `latestToken`
 *   variable and use it for the NEXT outgoing request — we do NOT dispatch it to
 *   Redux.  Dispatching on every response changes `accessToken` in the store on
 *   every API call, which recreates any useCallback that depends on `accessToken`,
 *   which re-fires the useEffect that called the API, causing an infinite loop.
 *
 * • When the access token (or latestToken) has expired the interceptor:
 *     1. Reads the response body for SESSION_EXPIRED — inactivity timeout.
 *        → clears latestToken + Redux, redirects to /login?reason=session_expired
 *     2. Ordinary 401 → calls POST /auth/refresh (httpOnly refreshToken cookie)
 *        → stores the new access token in latestToken (no Redux dispatch)
 *        → retries the original request once with the fresh token
 *        → if refresh fails → dispatches clearCredentials() so the Shell redirects
 *
 * • latestToken is cleared via a Redux subscription whenever accessToken becomes
 *   null (logout / session expiry), so a stale cache cannot survive across
 *   logout + re-login within the same page session.
 *
 * Concurrent 401s share a single in-flight refresh promise (no thundering-herd).
 */

import { store } from '@/store'
import { clearCredentials } from '@/store/slices/authSlice'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

interface FetchOptions {
  token?: string
  method?: string
  body?: unknown
}

// ── Module-level token cache ──────────────────────────────────────────────────
// Updated on every authenticated response without touching Redux.
// apiFetch reads it at call time so the inactivity window keeps rolling
// without causing component re-renders.
let latestToken: string | null = null

// Clear the cache when the user is fully logged out (accessToken → null).
store.subscribe(() => {
  const { accessToken } = (
    store.getState() as { auth: { accessToken: string | null } }
  ).auth
  if (!accessToken) latestToken = null
})

// ── Shared refresh promise ────────────────────────────────────────────────────
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

      // Store in the module cache only — no Redux dispatch.
      // The Redux accessToken from login remains as-is (it's still truthy so
      // the Shell shows authenticated UI).  All subsequent apiFetch calls will
      // use latestToken, which is fresh.
      latestToken = accessToken
      return accessToken
    } catch {
      // Refresh token is invalid/expired — force the user back to login.
      latestToken = null
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

/** Store X-Refreshed-Token locally — no Redux dispatch to avoid render loops. */
function absorbRefreshedToken(response: Response): void {
  const refreshed = response.headers.get('X-Refreshed-Token')
  if (refreshed) latestToken = refreshed
}

/** Redirect to the appropriate login page with a reason query param. */
function redirectToLogin(reason: string): void {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role = (store.getState() as any).auth?.role as string | null
    const loginPath = role === 'ADMIN' ? '/admin/login' : '/login'
    window.location.replace(`${loginPath}?reason=${reason}`)
  }
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, method = 'GET', body } = opts

  // Prefer the sliding-window latestToken over the caller's (possibly stale)
  // closure token.  Only upgrade if the caller supplied a token at all — an
  // unauthenticated call should stay unauthenticated.
  const effectiveToken = token ? (latestToken ?? token) : undefined

  const fetchInit: RequestInit = {
    method,
    headers: buildHeaders(effectiveToken),
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  const res = await fetch(`${BASE}/api${path}`, fetchInit)

  // ── Success ──────────────────────────────────────────────────────────────
  if (res.ok) {
    absorbRefreshedToken(res)
    return res.json() as Promise<T>
  }

  // ── 401 handling ─────────────────────────────────────────────────────────
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const errBody = await res.json().catch(() => ({ error: '' })) as { error?: string }

    // SESSION_EXPIRED = inactivity timeout — do NOT attempt a refresh.
    if (errBody.error === 'SESSION_EXPIRED') {
      latestToken = null
      // Read role before clearing — clearCredentials sets role to null synchronously,
      // so redirectToLogin must read it first to pick the correct login path.
      redirectToLogin('session_expired')
      store.dispatch(clearCredentials())
      throw new Error('Your session expired due to inactivity. Please sign in again.')
    }

    // Ordinary token expiry — try a silent refresh via the httpOnly cookie.
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
