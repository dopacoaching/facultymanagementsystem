import type { UserRole } from '@/types'

/** Client-side mirror of the server's validatePasswordComplexity rule. */
export function validatePasswordComplexity(pw: string): string | null {
  if (!pw || pw.length < 8)  return 'Password must be at least 8 characters'
  if (pw.length > 64)         return 'Password must be at most 64 characters'
  if (!/[A-Z]/.test(pw))     return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(pw))     return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(pw))     return 'Password must contain at least one digit'
  if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw))
    return 'Password must contain at least one special character (!@#$%^&* etc.)'
  return null
}

export const ALL_ROLES: UserRole[] = [
  'ADMIN', 'HR_MANAGER', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER',
  'COORDINATOR', 'IG_COORDINATOR', 'FACULTY',
]

export const ROLE_BADGE: Record<string, string> = {
  ADMIN:                'badge-red',
  HR_MANAGER:           'badge-yellow',
  ACADEMICS_MANAGER:    'badge-blue',
  IG_ACADEMICS_MANAGER: 'badge-blue',
  COORDINATOR:          'badge-green',
  IG_COORDINATOR:       'badge-green',
  FACULTY:              'badge-gray',
}

export const ROLE_DISPLAY: Record<string, string> = {
  ADMIN:                'Admin',
  HR_MANAGER:           'HR Manager',
  ACADEMICS_MANAGER:    'Academics Manager',
  IG_ACADEMICS_MANAGER: 'IG Academics Manager',
  COORDINATOR:          'Class Teacher',
  IG_COORDINATOR:       'IG Class Teacher',
  FACULTY:              'Faculty',
}

export function getRoleLabel(role: string) {
  return ROLE_DISPLAY[role] ?? role.replace(/_/g, ' ')
}
