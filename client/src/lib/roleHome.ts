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
  ACADEMICS_MANAGER:    '/academics',
  IG_ACADEMICS_MANAGER: '/ig',
  CLASS_TEACHER:        '/coordinator',
  IG_CLASS_TEACHER:     '/ig/sessions',
  FACULTY:              '/faculty',
}

/** Landing path for a role, falling back to the faculty home for anything unmapped. */
export function roleHomePath(role: string | null | undefined): string {
  return (role && ROLE_HOME[role]) || '/faculty'
}
