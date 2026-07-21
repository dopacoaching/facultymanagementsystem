'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { getAll as getSessions, getFacultyHoursSummary } from '@/services/session.service'
import type { FacultyHoursItem } from '@/services/session.service'
import { getBatches } from '@/services/faculty.service'
import { apiFetch } from '@/services/api'
import { isVideoFirstBatch } from '@/utils/batchUtils'
import type { Session } from '@/types'
import type { Batch } from '@/services/faculty.service'
import {
  ChapterSummary, Schedule,
  QuotaWarnings, FacultyHoursCard, VideoStatusCard, ScheduleStatusCard, RecentSessionsCard,
} from '@/components/academics/dashboard'

export default function AcademicsDashboard() {
  const router = useRouter()
  const { accessToken } = useAppSelector((s) => s.auth)
  const now = new Date()
  const [hoursMonth, setHoursMonth] = useState(now.getMonth() + 1)
  const [hoursYear,  setHoursYear]  = useState(now.getFullYear())
  const [facultyHours,        setFacultyHours]        = useState<FacultyHoursItem[]>([])
  const [facultyHoursLoading, setFacultyHoursLoading] = useState(false)
  const hoursReqRef = useRef(0)

  const [sessions,  setSessions]  = useState<Session[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [batches,   setBatches]   = useState<Batch[]>([])

  // Chapter summary per batch (aggregated on client side)
  const [chapterSummary, setChapterSummary] = useState<ChapterSummary[]>([])

  useEffect(() => {
    if (!accessToken) return
    loadFacultyHours(hoursMonth, hoursYear)
  }, [accessToken]) // eslint-disable-line

  function loadFacultyHours(m: number, y: number) {
    if (!accessToken) return
    const reqId = ++hoursReqRef.current
    setFacultyHoursLoading(true)
    getFacultyHoursSummary(m, y, accessToken)
      .then((data) => { if (reqId === hoursReqRef.current) setFacultyHours(data.faculty) })
      .catch(console.error)
      .finally(() => { if (reqId === hoursReqRef.current) setFacultyHoursLoading(false) })
  }

  useEffect(() => {
    if (!accessToken) return
    getSessions({}, accessToken).then(setSessions).catch(console.error)
    apiFetch<Schedule[]>('/academics/schedules', { token: accessToken }).then(setSchedules).catch(console.error)
    getBatches(accessToken).then((list) => {
      const ac = list.filter((b) => b.type !== 'IG')
      setBatches(ac)

      // Load chapter stats for Residential + Online batches using a single
      // aggregate query instead of N parallel per-batch requests.
      const videoFirstBatches = ac.filter((b) => isVideoFirstBatch(b.type))
      if (videoFirstBatches.length > 0) {
        const ids = videoFirstBatches.map((b) => b._id).join(',')
        apiFetch<ChapterSummary[]>(`/academics/chapters/summary?batchIds=${ids}`, { token: accessToken! })
          .then(setChapterSummary)
          .catch(console.error)
      }
    }).catch(console.error)
  }, [accessToken])

  const todayStr  = todayLocal()
  const today     = sessions.filter((s) => s.sessionDate?.startsWith(todayStr))
  const completed = sessions.filter((s) => s.status === 'COMPLETED')
  const cancelled = sessions.filter((s) => s.status === 'CANCELLED')
  const scheduled = sessions.filter((s) => s.status === 'SCHEDULED')

  const unpublishedSchedules = schedules.filter((s) => !s.isPublished)
  const recentPublished      = schedules.filter((s) => s.isPublished).slice(0, 3)

  // Batches with pending video (need attention)
  const pendingVideoBatches = chapterSummary.filter((cs) => cs.pendingVideo > 0)

  // Quota warnings — faculty who are AT_RISK or MISSED
  const quotaWarnings = facultyHours.filter((f) => f.status === 'AT_RISK' || f.status === 'MISSED')

  function getBatchName(b: string | { _id: string; name: string }): string {
    if (typeof b === 'object') return b.name
    return batches.find((bt) => bt._id === b)?.name ?? b
  }

  return (
    <div>
      <div className="stats-grid">
        {[
          { label: 'Total Sessions',  value: sessions.length,  icon: '📚', color: 'var(--color-primary)' },
          { label: "Today's",         value: today.length,     icon: '📅', color: 'var(--color-accent)' },
          { label: 'Completed',       value: completed.length, icon: '✅', color: 'var(--color-success)' },
          { label: 'Scheduled',       value: scheduled.length, icon: '⏳', color: 'var(--color-info)' },
          { label: 'Cancelled',       value: cancelled.length, icon: '❌', color: 'var(--color-danger)' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={{ color }}>{value}</div>
              </div>
              <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      <QuotaWarnings quotaWarnings={quotaWarnings} />

      <FacultyHoursCard
        facultyHours={facultyHours}
        loading={facultyHoursLoading}
        hoursMonth={hoursMonth}
        hoursYear={hoursYear}
        onMonthChange={(m) => { setHoursMonth(m); loadFacultyHours(m, hoursYear) }}
        onYearChange={(y) => { setHoursYear(y); loadFacultyHours(hoursMonth, y) }}
      />

      <div className="panel-grid-2" style={{ marginBottom: '1.25rem' }}>
        <VideoStatusCard chapterSummary={chapterSummary} batches={batches} pendingVideoBatches={pendingVideoBatches} />
        <ScheduleStatusCard
          schedules={schedules}
          unpublishedSchedules={unpublishedSchedules}
          recentPublished={recentPublished}
          getBatchName={getBatchName}
        />
      </div>

      <RecentSessionsCard sessions={sessions} onLogSession={() => router.push('/academics/sessions')} />
    </div>
  )
}
