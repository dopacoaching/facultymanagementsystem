import type { AvailabilityStatus } from '@/services/availability.service'

export const STATUS_STYLE: Record<AvailabilityStatus, { badge: string; label: string }> = {
  AVAILABLE:   { badge: 'badge-green',  label: 'Available'   },
  RESCHEDULED: { badge: 'badge-yellow', label: 'Rescheduled' },
  CANCELLED:   { badge: 'badge-red',    label: 'Cancelled'   },
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}
