import Link from 'next/link'
import { EmptyState } from '@/components/ui/Skeleton'
import { SALARY_ON_HOLD_MESSAGE } from '@/lib/constants/features'

/** Shown in place of any salary screen while salary calculation is on hold. */
export function SalaryOnHold() {
  return (
    <div className="card">
      <EmptyState iconName="wallet" title="Salary calculation is on hold" description={SALARY_ON_HOLD_MESSAGE}>
        <Link href="/" className="btn btn-outline" style={{ marginTop: '1rem' }}>Back to dashboard</Link>
      </EmptyState>
    </div>
  )
}
