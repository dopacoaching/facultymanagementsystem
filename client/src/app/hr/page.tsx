'use client'
import { EntriesOverview } from '@/components/dashboard/EntriesOverview'
import { QuickLinks } from '@/components/hr/dashboard'

export default function HRDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <EntriesOverview />
      <QuickLinks />
    </div>
  )
}
