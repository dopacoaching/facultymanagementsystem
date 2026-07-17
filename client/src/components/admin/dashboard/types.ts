export interface ISession {
  _id: string
  facultyId: { name: string } | string | null
  subject: string
  sessionDate: string
  status: string
}

export const STATUS_BADGE: Record<string, string> = {
  COMPLETED:     'badge-green',
  CANCELLED:     'badge-red',
  SCHEDULED:     'badge-blue',
  NOT_COMPLETED: 'badge-yellow',
}

export const EVENT_BADGE: Record<string, string> = {
  SALARY_APPROVED:       'badge-green',
  PENALTY_APPLIED:       'badge-red',
  SESSION_CANCELLED:     'badge-red',
  PAY_CONFIG_UPDATED:    'badge-yellow',
  SALARY_FIELD_CHANGED:  'badge-yellow',
  OVERTIME_ADDED:        'badge-blue',
  BALANCE_CARRY_FORWARD: 'badge-blue',
  FACULTY_CREATED:       'badge-green',
  FACULTY_UPDATED:       'badge-gray',
}

export interface StatItem {
  label: string
  value: number | string
  icon: string
  color: string
}
