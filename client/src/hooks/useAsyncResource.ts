'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export type ResourceStatus = 'loading' | 'success' | 'error'

export interface AsyncResource<T> {
  /** `loading` on first load; stays `success`/`error` while a refetch runs. */
  status: ResourceStatus
  data: T | undefined
  error: Error | undefined
  /** A refetch is in flight over already-loaded (or previously-errored) data. */
  isRefetching: boolean
  /** Re-run the fetcher. Safe to wire to a Retry button. */
  refetch: () => void
}

/**
 * Loads one async resource and keeps the four states distinct:
 *   - initial loading           → status 'loading'
 *   - loaded, possibly empty    → status 'success' (data may be [] / null)
 *   - failed                    → status 'error' + error (never a silent [])
 *   - refreshing existing data  → status unchanged, isRefetching true
 *
 * Out-of-order responses are ignored: only the most recent call may commit.
 *
 * `enabled: false` holds in the loading state without fetching (e.g. waiting
 * for an access token).
 */
export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
  { enabled = true }: { enabled?: boolean } = {},
): AsyncResource<T> {
  const [status, setStatus] = useState<ResourceStatus>('loading')
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [isRefetching, setIsRefetching] = useState(false)

  const callId = useRef(0)
  const resolvedOnce = useRef(false)
  // Keep the latest fetcher without making it a dependency.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const run = useCallback(() => {
    if (!enabled) return
    // Bumping the id here invalidates any still-pending earlier call, so a
    // deps-change re-run or a manual refetch both supersede the previous fetch.
    const id = ++callId.current
    if (resolvedOnce.current) {
      setIsRefetching(true)           // keep the last good data on screen
      setStatus((s) => (s === 'success' ? s : 'loading'))
    } else {
      setStatus('loading')
    }

    fetcherRef.current()
      .then((result) => {
        if (id !== callId.current) return
        resolvedOnce.current = true
        setData(result)
        setError(undefined)
        setStatus('success')
      })
      .catch((e: unknown) => {
        if (id !== callId.current) return
        resolvedOnce.current = true
        setError(e instanceof Error ? e : new Error(String(e)))
        setStatus('error')
      })
      .finally(() => {
        if (id === callId.current) setIsRefetching(false)
      })
  }, [enabled])

  useEffect(() => {
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  const refetch = useCallback(() => { run() }, [run])

  return { status, data, error, isRefetching, refetch }
}
