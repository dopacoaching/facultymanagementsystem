'use client'
import { useAppSelector } from '@/store/hooks'
import { getAll as getFaculty } from '@/services/faculty.service'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { EntriesOverview } from '@/components/dashboard/EntriesOverview'
import { QuickLinksSection, StatsSection } from '@/components/admin/dashboard'

export default function AdminDashboard() {
  const { accessToken } = useAppSelector((s) => s.auth)

  const faculty = useAsyncResource(
    () => getFaculty(accessToken!, true),
    [accessToken],
    { enabled: !!accessToken },
  )
  const list = faculty.data ?? []
  const active = list.filter((f) => f.isActive).length
  const dash = faculty.status === 'success' ? undefined : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <QuickLinksSection />
      <EntriesOverview
        leading={
          <StatsSection
            title="Faculty"
            stats={[
              { label: 'Total Faculty', value: dash ?? list.length,         color: 'var(--color-text)' },
              { label: 'Active',        value: dash ?? active,              color: 'var(--color-success)' },
              { label: 'Inactive',      value: dash ?? list.length - active, color: 'var(--color-muted)' },
            ]}
          />
        }
      />
    </div>
  )
}
