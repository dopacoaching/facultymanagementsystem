'use client'
import { todayLocal } from '@/utils/date'
import { useAppSelector } from '@/store/hooks'
import { apiFetch } from '@/services/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { AsyncSection } from '@/components/ui/AsyncSection'
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton'
import {
  ISession, DailySlot, ISChapter, ISStatsBar, TodayScheduleCard, RecentSessionsCard, ChapterProgressCard,
} from '@/components/integrated-school/dashboard'

export default function ISDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)
  const enabled = !!accessToken

  const sessionsRes = useAsyncResource<ISession[]>(
    () => apiFetch<ISession[]>('/ig/sessions', { token: accessToken! }),
    [accessToken], { enabled },
  )
  const timetableRes = useAsyncResource<DailySlot[]>(
    () => apiFetch<{ slots: DailySlot[] }>(`/ig/timetable/daily?date=${todayLocal()}`, { token: accessToken! })
      .then((r) => r.slots),
    [accessToken], { enabled },
  )
  const chaptersRes = useAsyncResource<ISChapter[]>(
    () => apiFetch<ISChapter[]>('/ig/chapters', { token: accessToken! }),
    [accessToken], { enabled },
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Stat bar needs both sessions and chapters — show it only when both are in. */}
      {sessionsRes.status === 'success' && chaptersRes.status === 'success' ? (
        <ISStatsBar
          totalSessions={sessionsRes.data!.length}
          completed={sessionsRes.data!.filter((s) => s.status === 'COMPLETED').length}
          cancelled={sessionsRes.data!.filter((s) => s.status === 'CANCELLED').length}
          chaptersDone={chaptersRes.data!.filter((c) => c.status === 'COMPLETED').length}
          chaptersTotal={chaptersRes.data!.length}
        />
      ) : sessionsRes.status === 'error' || chaptersRes.status === 'error' ? null : (
        <SkeletonStats count={4} />
      )}

      <div className="panel-grid-2" style={{ marginBottom: 0 }}>
        <AsyncSection
          resource={timetableRes}
          what="today's timetable"
          loading={<SkeletonCard lines={4} />}
        >
          {(slots) => <TodayScheduleCard todaySlots={slots} />}
        </AsyncSection>

        <AsyncSection
          resource={sessionsRes}
          what="recent sessions"
          loading={<SkeletonCard lines={4} />}
        >
          {(sessions) => <RecentSessionsCard sessions={sessions} />}
        </AsyncSection>
      </div>

      <AsyncSection
        resource={chaptersRes}
        what="chapter progress"
        loading={<SkeletonCard lines={4} />}
      >
        {(chapters) => <ChapterProgressCard chapters={chapters} />}
      </AsyncSection>
    </div>
  )
}
