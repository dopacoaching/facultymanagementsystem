'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { getAll } from '@/services/session.service'
import { apiFetch } from '@/services/api'
import type { Session } from '@/types'
import { SkeletonTable, ErrorAlert } from '@/components/ui/Skeleton'
import {
  WeeklySchedule, SessionFilterKey,
  UpcomingScheduleCard, SessionLogTable,
} from '@/components/faculty/sessions'

export default function FacultySessionsPage() {
  const { accessToken, facultyId, batchId: myBatchId } = useAppSelector((s) => s.auth)

  // Session log state
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [filter,    setFilter]    = useState<SessionFilterKey>('ALL')

  // Schedule state
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(() => {
    if (!accessToken || !facultyId) return
    const schedUrl = myBatchId
      ? `/academics/schedules?batchId=${myBatchId}`
      : '/academics/schedules'

    setLoading(true)
    setLoadError('')
    // Fetch independently so a schedule failure doesn't blank the session log (and vice versa).
    Promise.allSettled([
      getAll({ facultyId }, accessToken),
      apiFetch<WeeklySchedule[]>(schedUrl, { token: accessToken }),
    ]).then(([sessRes, schedRes]) => {
      if (sessRes.status === 'fulfilled') setSessions(sessRes.value)
      if (schedRes.status === 'fulfilled') setSchedules(schedRes.value.filter((s) => s.isPublished))
      const errs: string[] = []
      if (sessRes.status === 'rejected')
        errs.push(sessRes.reason instanceof Error ? sessRes.reason.message : 'Failed to load sessions')
      if (schedRes.status === 'rejected')
        errs.push(schedRes.reason instanceof Error ? schedRes.reason.message : 'Failed to load schedule')
      if (errs.length) setLoadError(errs.join(' · '))
    }).finally(() => setLoading(false))
  }, [accessToken, facultyId, myBatchId])

  useEffect(() => { load() }, [load])

  // ── Derive current week schedule ──────────────────────────────────────────

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  // ── Upcoming published schedules (current + future) ───────────────────────

  const upcomingSchedules = useMemo(() =>
    [...schedules]
      .filter((s) => new Date(s.weekEndDate) >= today)
      .sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime())
  , [schedules, today])

  // ── Session log ───────────────────────────────────────────────────────────

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
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.125rem' }}>My Sessions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Weekly schedule &amp; your session log
          </p>
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorAlert message={loadError} what="Could not load your data" onRetry={load} />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — UPCOMING WEEKLY SCHEDULES                              */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-muted)' }}>
          📅 Upcoming Schedule
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      {upcomingSchedules.length === 0 ? (
        <div className="card" style={{ marginBottom: '1.5rem', color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>
          No published schedules yet. Check back later.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
          {upcomingSchedules.map((s) => (
            <UpcomingScheduleCard key={s._id} schedule={s} today={today} facultyId={facultyId} />
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — SESSION LOG                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-muted)' }}>
          🗂 Session Log
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      <SessionLogTable sessions={sessions} filtered={filtered} filter={filter} onFilterChange={setFilter} />
    </div>
  )
}
