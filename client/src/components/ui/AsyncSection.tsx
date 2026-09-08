'use client'
import type { ReactNode } from 'react'
import type { AsyncResource } from '@/hooks/useAsyncResource'
import { ErrorAlert } from './Skeleton'

interface AsyncSectionProps<T> {
  resource: AsyncResource<T>
  /** Rendered while the resource is loading for the first time. */
  loading: ReactNode
  /** Short label for the failed resource, e.g. "today's timetable". */
  what: string
  /** Render successful data. Receives the (possibly empty) data. */
  children: (data: T) => ReactNode
}

/**
 * Renders one dashboard/section resource with its four states kept separate:
 * first-load skeleton, hard error (with a real Retry that re-runs the request),
 * and success (which may legitimately be empty — that's the child's call, not
 * a failure). A background refetch keeps the last good data on screen with a
 * quiet "Updating…" hint rather than flashing a skeleton.
 */
export function AsyncSection<T>({ resource, loading, what, children }: AsyncSectionProps<T>) {
  const { status, data, error, isRefetching, refetch } = resource

  if (status === 'loading') return <>{loading}</>

  if (status === 'error') {
    return (
      <ErrorAlert
        message={error?.message ?? ''}
        what={`Couldn't load ${what}`}
        onRetry={refetch}
      />
    )
  }

  return (
    <>
      {isRefetching && (
        <p className="help-text" role="status" style={{ marginBottom: '0.5rem' }}>
          Updating {what}…
        </p>
      )}
      {children(data as T)}
    </>
  )
}
