'use client'
import { EntriesOverview } from '@/components/dashboard/EntriesOverview'
import { QuickLinks } from '@/components/hr/dashboard'

export default function HRDashboard() {
  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>HR Dashboard</h1>
          <p className="page-subtitle">Today&apos;s campus entries, range totals and shortcuts.</p>
        </div>
      </div>
      <EntriesOverview />
      <QuickLinks />
    </div>
  )
}
