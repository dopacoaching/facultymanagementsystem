import type { SalaryAlert, SalaryResult } from '@/types'

export const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function alertClass(level: SalaryAlert['level']): string {
  if (level === 'BLOCK')   return 'alert alert-error'
  if (level === 'WARNING') return 'alert alert-warning'
  return 'alert alert-info'
}

export function alertIcon(level: SalaryAlert['level']): string {
  if (level === 'BLOCK')   return '🚫'
  if (level === 'WARNING') return '⚠️'
  return '💡'
}

export function statusBadge(status: SalaryResult['status']): string {
  if (status === 'OK')             return 'badge-green'
  if (status === 'HR_REVIEW')      return 'badge-yellow'
  if (status === 'PENDING_CONFIG') return 'badge-yellow'
  return 'badge-red'
}
