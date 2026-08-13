'use client'
import { todayLocal } from '@/utils/date'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty } from '@/services/faculty.service'
import { getAll as getSessions } from '@/services/session.service'
import { getAuditLog } from '@/services/salary.service'
import type { Faculty, AuditLog } from '@/types'
import type { Session } from '@/types'
import { SkeletonStats, SkeletonCard } from '@/components/ui/Skeleton'
import {
  QuickLinksSection, StatsSection, FacultyListCard,
  RecentSessionsCard, RecentActivityCard,
} from '@/components/admin/dashboard'

export default function AdminDashboard() {
  const router = useRouter()
  const { accessToken } = useAppSelector((s) => s.auth)

  const [faculty,     setFaculty]     = useState<Faculty[]>([])
  const [acSessions,  setAcSessions]  = useState<Session[]>([])
  const [auditLogs,   setAuditLogs]   = useState<AuditLog[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    Promise.all([
      getFaculty(accessToken, true).catch(() => [] as Faculty[]),
      getSessions({}, accessToken).catch(() => [] as Session[]),
      getAuditLog(accessToken, 1, 8).catch(() => ({ logs: [] as AuditLog[] })),
    ]).then(([fac, ac, audit]) => {
      setFaculty(fac as Faculty[])
      setAcSessions(ac as Session[])
      setAuditLogs((audit as { logs: AuditLog[] }).logs)
    }).finally(() => setLoading(false))
  }, [accessToken])

  // ── derived counts ──────────────────────────────────────────────────────────
  const activeFaculty   = faculty.filter((f) => f.isActive).length
  const inactiveFaculty = faculty.length - activeFaculty

  const acCompleted = acSessions.filter((s) => s.status === 'COMPLETED').length
  const acCancelled = acSessions.filter((s) => s.status === 'CANCELLED').length
  const acScheduled = acSessions.filter((s) => s.status === 'SCHEDULED').length

  const todayStr = todayLocal()
  const todayAC  = acSessions.filter((s) => s.sessionDate?.startsWith(todayStr)).length

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

      {/* ── Stats row: HR + class hours side by side ─────────────────────────── */}
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
          title="Class Hours"
          stats={[
            { label: 'Total',     value: acSessions.length, icon: '📚', color: 'var(--color-primary)' },
            { label: "Today",     value: todayAC,           icon: '📅', color: 'var(--color-accent)'  },
            { label: 'Done',      value: acCompleted,       icon: '✅', color: 'var(--color-success)' },
            { label: 'Scheduled', value: acScheduled,       icon: '⏳', color: 'var(--color-info)'    },
            { label: 'Cancelled', value: acCancelled,       icon: '❌', color: 'var(--color-danger)'  },
          ]}
        />
      </div>

      {/* ── Details grid ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <FacultyListCard faculty={faculty} onAdd={() => router.push('/hr/faculty')} />
        <RecentSessionsCard sessions={acSessions} />
        <RecentActivityCard auditLogs={auditLogs} />
      </div>
    </div>
  )
}
