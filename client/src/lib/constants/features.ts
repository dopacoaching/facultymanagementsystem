/**
 * Salary calculation is ON HOLD — the system currently only records entries
 * (sessions) and reports on them. All salary code, models and data are kept
 * intact; set NEXT_PUBLIC_SALARY_ENABLED=true (and redeploy) to switch it back on.
 */
export const SALARY_ENABLED = process.env.NEXT_PUBLIC_SALARY_ENABLED === 'true'

/**
 * While the rest of salary is on hold, TEMPORARY faculty (paid for a from/to date range) stay live for
 * Admin and HR Manager: the range salary check, approval and the saved-pay report. Month-based pay,
 * payable days, carry-forward and the faculty's own salary view remain on hold.
 */
export const SALARY_TEMPORARY_ENABLED = true

/** True when a salary request may run: salary is fully on, or it is a temporary-faculty date-range request. */
export const salaryAllowed = (isRange: boolean): boolean => SALARY_ENABLED || (SALARY_TEMPORARY_ENABLED && isRange)

export const SALARY_ON_HOLD_MESSAGE =
  'Salary calculation is on hold. Only session entries and reports are available right now.'

/** "Not submitted" days are only tracked from this date; earlier days are never reported as missing. */
export const NOT_SUBMITTED_FROM = '2026-10-01'
