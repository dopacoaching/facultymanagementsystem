/**
 * Validates password complexity.
 * Rules: 8–64 chars · ≥1 uppercase · ≥1 lowercase · ≥1 digit · ≥1 special char.
 * Returns an error string if invalid, or null if the password is acceptable.
 */
export function validatePasswordComplexity(password: string): string | null {
  if (!password || password.length < 8)  return 'Password must be at least 8 characters'
  if (password.length > 64)              return 'Password must be at most 64 characters'
  if (!/[A-Z]/.test(password))          return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(password))          return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(password))          return 'Password must contain at least one digit'
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password))
    return 'Password must contain at least one special character (!@#$%^&* etc.)'
  return null
}
