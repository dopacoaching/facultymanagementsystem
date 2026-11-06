import type { HoursProgressItem, PayrollStatusItem } from '@/services/salary.service'

export function progressColor(status: HoursProgressItem['status']): string {
  if (status === 'MET')      return 'var(--color-success)'
  if (status === 'ON_TRACK') return 'var(--color-primary)'
  if (status === 'AT_RISK')  return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export function progressBg(status: HoursProgressItem['status']): string {
  if (status === 'MET')      return 'var(--color-success-bg)'
  if (status === 'ON_TRACK') return 'var(--color-primary-ghost)'
  if (status === 'AT_RISK')  return 'var(--color-warning-bg)'
  return 'var(--color-danger-bg)'
}

export function payrollBadge(status: PayrollStatusItem['status']): string {
  if (status === 'APPROVED') return 'badge-green'
  if (status === 'PENDING')  return 'badge-yellow'
  return 'badge-red'
}

export function contractShortName(type: string): string {
  const map: Record<string, string> = {
    FIXED_QUOTA_CARRYFORWARD: 'Carry-Fwd Quota',
    FIXED_QUOTA_NOCARRY:      'Display Quota',
    BASE_OVERTIME:            'Base + Overtime',
  }
  return map[type] ?? type
}
