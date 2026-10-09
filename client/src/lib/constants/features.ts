/**
 * Salary calculation is ON HOLD — the system currently only records entries
 * (sessions) and reports on them. All salary code, models and data are kept
 * intact; set NEXT_PUBLIC_SALARY_ENABLED=true (and redeploy) to switch it back on.
 */
export const SALARY_ENABLED = process.env.NEXT_PUBLIC_SALARY_ENABLED === 'true'

export const SALARY_ON_HOLD_MESSAGE =
  'Salary calculation is on hold. Only session entries and reports are available right now.'
