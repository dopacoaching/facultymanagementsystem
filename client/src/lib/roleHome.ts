/**
 * Canonical post-login landing path per role.
 *
 * Single source of truth for the login pages and the SSO bridge pages so the
 * two flows can never send the same role to different places. ADMIN is included
 * here for completeness (the admin bridge lands on it explicitly); the staff
 * login / staff SSO flows special-case ADMIN before this map is consulted.
 */
export const ROLE_HOME: Record<string, string> = {
  ADMIN:                '/admin',
  HR_MANAGER:           '/hr',
  CLASS_TEACHER:        '/coordinator',
  IG_CLASS_TEACHER:     '/coordinator',
  FACULTY:              '/faculty',
}

/**
 * True for roles that still exist. Accounts left on a removed role (the former
 * Academics Manager / IG Academics Manager) are refused at login, SSO and token
 * refresh until an admin reassigns them.
 */
export function isActiveRole(role: string | null | undefined): boolean {
  return !!role && role in ROLE_HOME
}

export const REMOVED_ROLE_ERROR = "This account's role has been removed. Ask an admin to assign a new role."

/** Landing path for a role, falling back to the faculty home for anything unmapped. */
export function roleHomePath(role: string | null | undefined): string {
  return (role && ROLE_HOME[role]) || '/faculty'
}
