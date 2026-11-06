import type { AuditEventType, AuditCategory } from '@/lib/types'
import type { IconName } from '@/components/ui/Icon'

export interface AuditLogEntry {
  _id: string
  referenceNumber: string
  category: AuditCategory
  eventType: AuditEventType
  actorUserId: string
  actorRole: string
  actorUsername?: string
  targetType?: string
  targetId?: string
  targetName?: string
  description: string
  reason?: string       // legacy field from old documents
  metadata?: Record<string, unknown>
  amount?: number
  cancellationInitiator?: string
  timestamp: string
}

export const CATEGORIES: { value: string; label: string }[] = [
  { value: 'ALL',       label: 'All Categories' },
  { value: 'HR',        label: 'HR & Salary' },
  { value: 'ACADEMICS', label: 'Academics' },
  { value: 'IG',        label: 'Integrated School' },
  { value: 'ADMIN',     label: 'Admin' },
  { value: 'AUTH',      label: 'Auth' },
]

export const CATEGORY_BADGE: Record<string, string> = {
  HR:        'badge-yellow',
  ACADEMICS: 'badge-blue',
  IG:        'badge-purple',
  ADMIN:     'badge-red',
  AUTH:      'badge-gray',
}

export const EVENT_ICON: Partial<Record<AuditEventType, IconName>> = {
  FACULTY_CREATED:        'user',
  FACULTY_UPDATED:        'edit',
  PAY_CONFIG_UPDATED:     'wallet',
  SALARY_APPROVED:        'check',
  PENALTY_APPLIED:        'alert',
  OVERTIME_ADDED:         'clock',
  BALANCE_CARRY_FORWARD:  'history',
  SESSION_LOGGED:         'book',
  SESSION_UPDATED:        'edit',
  SESSION_STATUS_CHANGED: 'history',
  SESSION_CANCELLED:      'ban',
  CHAPTER_UPDATED:        'bookmark',
  SCHEDULE_CREATED:       'calendar',
  SCHEDULE_UPDATED:       'edit',
  SCHEDULE_PUBLISHED:     'send',
  SCHEDULE_REVISED:       'history',
  SCHEDULE_DELETED:       'ban',
  IG_SESSION_LOGGED:      'school',
  IG_SESSION_STATUS_CHANGED: 'history',
  IG_SESSION_CANCELLED:   'ban',
  IG_CHAPTER_UPDATED:     'bookmark',
  IG_TIMETABLE_ASSIGNED:  'calendar',
  IG_TIMETABLE_UPDATED:   'edit',
  IG_TIMETABLE_DELETED:   'ban',
  SPECIAL_DAY_ADDED:      'calendar',
  SPECIAL_DAY_DELETED:    'ban',
  USER_ACCOUNT_CREATED:   'key',
  USER_ACCOUNT_UPDATED:   'edit',
  USER_LOGGED_IN:         'key',
  USER_LOGGED_OUT:        'logout',
  PASSWORD_CHANGED:       'shield',
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN:                'Admin',
  HR_MANAGER:           'HR Manager',
  ACADEMICS_MANAGER:    'Academics Mgr',
  IG_ACADEMICS_MANAGER: 'IG Academics Mgr',
  CLASS_TEACHER:        'Class Teacher',
  IG_CLASS_TEACHER:     'IG Class Teacher',
  IG_JOINT_TEACHER:     'IG Joint Entry',
  REPEATERS_JOINT_TEACHER: 'Repeaters Joint Entry',
  COORDINATOR:          'Class Teacher',    // legacy actorRole on audit rows predating the CLASS_TEACHER rename
  IG_COORDINATOR:       'IG Class Teacher', // legacy actorRole on audit rows predating the IG_CLASS_TEACHER rename
  FACULTY:              'Faculty',
  SYSTEM:               'System',
}

export function fmtDate(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
