/**
 * apiFetch — centralised HTTP client with automatic silent token refresh.
 *
 * On any 401 from a non-auth endpoint the interceptor:
 *  1. Calls POST /auth/refresh (uses the httpOnly refreshToken cookie)
 *  2. Updates the Redux store with the new access token
 *  3. Retries the original request once with the new token
 *  4. If refresh fails → dispatches clearCredentials() so the Shell redirects to /login
 *
 * Concurrent requests that all 401 at the same time share a single in-flight
 * refresh promise (no thundering-herd of refresh calls).
 */

import { store } from '@/store'
import { setCredentials, clearCredentials } from '@/store/slices/authSlice'

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
      // The persisted reducer adds _persist at root level; auth is always present.
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

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, method = 'GET', body } = opts
  const fetchInit: RequestInit = {
    method,
    headers: buildHeaders(token),
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  const res = await fetch(`${BASE}/api${path}`, fetchInit)

  // ── Silent refresh on 401 (skip auth endpoints to avoid loops) ────────────
  if (res.status === 401 && !path.startsWith('/auth/')) {
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

    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({ error: `HTTP ${retryRes.status}` }))
      throw new Error((err as { error?: string }).error ?? 'Request failed')
    }
    return retryRes.json() as Promise<T>
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error((err as { error?: string }).error ?? 'Request failed')
  }

  return res.json() as Promise<T>
}
