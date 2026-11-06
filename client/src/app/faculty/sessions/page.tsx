'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/session.service'
import type { Session } from '@/types'
import { SkeletonTable, ErrorAlert } from '@/components/ui/Skeleton'
import { SessionFilterKey, SessionLogTable } from '@/components/faculty/sessions'

export default function FacultySessionsPage() {
  const { accessToken, facultyId } = useAppSelector((s) => s.auth)

  const [sessions,  setSessions]  = useState<Session[]>([])
  const [filter,    setFilter]    = useState<SessionFilterKey>('ALL')
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(() => {
    if (!accessToken || !facultyId) return
    setLoading(true)
    setLoadError('')
    getAll({ facultyId }, accessToken)
      .then(setSessions)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load sessions'))
      .finally(() => setLoading(false))
  }, [accessToken, facultyId])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'ALL' ? sessions : sessions.filter((s) => s.status === filter)

  if (loading) {
    return (
      <div className="card">
        <SkeletonTable rows={6} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>My Sessions</h1>
          <p className="page-subtitle">Your session log</p>
        </div>
      </div>

      {loadError && (
        <div className="mb-4">
          <ErrorAlert message={loadError} what="Could not load your data" onRetry={load} />
        </div>
      )}

      <SessionLogTable sessions={sessions} filtered={filtered} filter={filter} onFilterChange={setFilter} />
    </div>
  )
}
