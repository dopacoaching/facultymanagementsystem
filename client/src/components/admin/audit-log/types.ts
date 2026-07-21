import type { AuditEventType, AuditCategory } from '@/lib/types'

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

export const EVENT_ICON: Partial<Record<AuditEventType, string>> = {
  FACULTY_CREATED:        '👤',
  FACULTY_UPDATED:        '✏️',
  PAY_CONFIG_UPDATED:     '💰',
  SALARY_APPROVED:        '✅',
  PENALTY_APPLIED:        '⚠️',
  OVERTIME_ADDED:         '⏰',
  BALANCE_CARRY_FORWARD:  '↩️',
  SESSION_LOGGED:         '📝',
  SESSION_UPDATED:        '✏️',
  SESSION_STATUS_CHANGED: '🔄',
  SESSION_CANCELLED:      '❌',
  CHAPTER_UPDATED:        '📚',
  SCHEDULE_CREATED:       '🗓',
  SCHEDULE_UPDATED:       '✏️',
  SCHEDULE_PUBLISHED:     '📢',
  SCHEDULE_REVISED:       '🔄',
  SCHEDULE_DELETED:       '🗑',
  IG_SESSION_LOGGED:      '🏫',
  IG_SESSION_STATUS_CHANGED: '🔄',
  IG_SESSION_CANCELLED:   '❌',
  IG_CHAPTER_UPDATED:     '📖',
  IG_TIMETABLE_ASSIGNED:  '📅',
  IG_TIMETABLE_UPDATED:   '✏️',
  IG_TIMETABLE_DELETED:   '🗑',
  SPECIAL_DAY_ADDED:      '🏖',
  SPECIAL_DAY_DELETED:    '🗑',
  USER_ACCOUNT_CREATED:   '🔐',
  USER_ACCOUNT_UPDATED:   '✏️',
  USER_LOGGED_IN:         '🔑',
  USER_LOGGED_OUT:        '🚪',
  PASSWORD_CHANGED:       '🔒',
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN:                'Admin',
  HR_MANAGER:           'HR Manager',
  ACADEMICS_MANAGER:    'Academics Mgr',
  IG_ACADEMICS_MANAGER: 'IG Academics Mgr',
  COORDINATOR:          'Class Teacher',
  IG_COORDINATOR:       'IG Class Teacher',
  FACULTY:              'Faculty',
  SYSTEM:               'System',
}

export function fmtDate(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
