'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton'
import {
  ISession, DailySlot, ISChapter, ISStatsBar, TodayScheduleCard, RecentSessionsCard, ChapterProgressCard,
} from '@/components/integrated-school/dashboard'

function today(): string {
  return todayLocal()
}

export default function ISDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const [sessions, setSessions] = useState<ISession[]>([])
  const [todaySlots, setTodaySlots] = useState<DailySlot[]>([])
  const [chapters, setChapters] = useState<ISChapter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    Promise.all([
      apiFetch<ISession[]>('/ig/sessions', { token: accessToken }).catch(() => [] as ISession[]),
      apiFetch<{ slots: DailySlot[] }>(`/ig/timetable/daily?date=${today()}`, { token: accessToken }).catch(() => ({ slots: [] as DailySlot[] })),
      apiFetch<ISChapter[]>('/ig/chapters', { token: accessToken }).catch(() => [] as ISChapter[]),
    ]).then(([sess, timetable, chs]) => {
      setSessions(sess as ISession[])
      setTodaySlots((timetable as { slots: DailySlot[] }).slots)
      setChapters(chs as ISChapter[])
    }).finally(() => setLoading(false))
  }, [accessToken])

  const completed = sessions.filter((s) => s.status === 'COMPLETED').length
  const cancelled = sessions.filter((s) => s.status === 'CANCELLED').length
  const chaptersDone = chapters.filter((c) => c.status === 'COMPLETED').length
  const chaptersTotal = chapters.length

  if (loading) {
    return (
      <div>
        <SkeletonStats count={4} />
        <div className="panel-grid-2" style={{ marginTop: '1.5rem' }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <ISStatsBar
        totalSessions={sessions.length}
        completed={completed}
        cancelled={cancelled}
        chaptersDone={chaptersDone}
        chaptersTotal={chaptersTotal}
      />

      <div className="panel-grid-2" style={{ marginBottom: 0 }}>
        <TodayScheduleCard todaySlots={todaySlots} />
        <RecentSessionsCard sessions={sessions} />
      </div>

      <ChapterProgressCard chapters={chapters} />
    </div>
  )
}
