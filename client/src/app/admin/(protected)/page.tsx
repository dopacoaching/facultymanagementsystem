'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty } from '@/services/faculty.service'
import { getAll as getSessions } from '@/services/session.service'
import { getAuditLog } from '@/services/salary.service'
import { apiFetch } from '@/services/api'
import type { Faculty, AuditLog } from '@/types'
import type { Session } from '@/types'
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton'
import {
  ISession,
  QuickLinksSection, StatsSection, FacultyListCard,
  RecentSessionsCard, RecentIGSessionsCard, RecentActivityCard,
} from '@/components/admin/dashboard'

export default function AdminDashboard() {
  const router = useRouter()
  const { accessToken } = useAppSelector((s) => s.auth)

  const [faculty,     setFaculty]     = useState<Faculty[]>([])
  const [acSessions,  setAcSessions]  = useState<Session[]>([])
  const [isSessions,  setIsSessions]  = useState<ISession[]>([])
  const [auditLogs,   setAuditLogs]   = useState<AuditLog[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    Promise.all([
      getFaculty(accessToken, true).catch(() => [] as Faculty[]),
      getSessions({}, accessToken).catch(() => [] as Session[]),
      apiFetch<ISession[]>('/ig/sessions', { token: accessToken }).catch(() => [] as ISession[]),
      getAuditLog(accessToken, 1, 8).catch(() => ({ logs: [] as AuditLog[] })),
    ]).then(([fac, ac, is, audit]) => {
      setFaculty(fac as Faculty[])
      setAcSessions(ac as Session[])
      setIsSessions(is as ISession[])
      setAuditLogs((audit as { logs: AuditLog[] }).logs)
    }).finally(() => setLoading(false))
  }, [accessToken])

  // ── derived counts ──────────────────────────────────────────────────────────
  const activeFaculty   = faculty.filter((f) => f.isActive).length
  const inactiveFaculty = faculty.length - activeFaculty

  const acCompleted = acSessions.filter((s) => s.status === 'COMPLETED').length
  const acCancelled = acSessions.filter((s) => s.status === 'CANCELLED').length
  const acScheduled = acSessions.filter((s) => s.status === 'SCHEDULED').length

  const isCompleted = isSessions.filter((s) => s.status === 'COMPLETED').length
  const isCancelled = isSessions.filter((s) => s.status === 'CANCELLED').length
  const isScheduled = isSessions.filter((s) => s.status === 'SCHEDULED').length

  const todayStr = todayLocal()
  const todayAC  = acSessions.filter((s) => s.sessionDate?.startsWith(todayStr)).length
  const todayIS  = isSessions.filter((s) => s.sessionDate?.startsWith(todayStr)).length

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <SkeletonStats count={3} />
        <div className="panel-grid-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <QuickLinksSection />

      {/* ── Stats row: HR + Academics + IG side by side ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <StatsSection
          title="HR Overview"
          stats={[
            { label: 'Total Faculty', value: faculty.length,   icon: '👥', color: 'var(--color-primary)' },
            { label: 'Active',        value: activeFaculty,    icon: '✅', color: 'var(--color-success)' },
            { label: 'Inactive',      value: inactiveFaculty,  icon: '⏸',  color: 'var(--color-muted)'   },
          ]}
        />
        <StatsSection
          title="Academics (Repeaters)"
          stats={[
            { label: 'Total',     value: acSessions.length, icon: '📚', color: 'var(--color-primary)' },
            { label: "Today",     value: todayAC,           icon: '📅', color: 'var(--color-accent)'  },
            { label: 'Done',      value: acCompleted,       icon: '✅', color: 'var(--color-success)' },
            { label: 'Scheduled', value: acScheduled,       icon: '⏳', color: 'var(--color-info)'    },
            { label: 'Cancelled', value: acCancelled,       icon: '❌', color: 'var(--color-danger)'  },
          ]}
        />
        <StatsSection
          title="Integrated School"
          stats={[
            { label: 'Total',     value: isSessions.length, icon: '🏫', color: 'var(--color-primary)' },
            { label: 'Today',     value: todayIS,           icon: '📅', color: 'var(--color-accent)'  },
            { label: 'Done',      value: isCompleted,       icon: '✅', color: 'var(--color-success)' },
            { label: 'Scheduled', value: isScheduled,       icon: '⏳', color: 'var(--color-info)'    },
            { label: 'Cancelled', value: isCancelled,       icon: '❌', color: 'var(--color-danger)'  },
          ]}
        />
      </div>

      {/* ── Details grid ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <FacultyListCard faculty={faculty} onAdd={() => router.push('/hr/faculty')} />
        <RecentSessionsCard sessions={acSessions} />
        <RecentIGSessionsCard sessions={isSessions} />
        <RecentActivityCard auditLogs={auditLogs} />
      </div>
    </div>
  )
}
