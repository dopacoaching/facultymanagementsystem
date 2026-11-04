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
 * On by default; set NEXT_PUBLIC_SALARY_TEMPORARY_ENABLED=false (and redeploy) to put these on hold too.
 */
export const SALARY_TEMPORARY_ENABLED = process.env.NEXT_PUBLIC_SALARY_TEMPORARY_ENABLED !== 'false'

/** True when a salary request is a date-range one (`from`/`to` present, even if blank) — used by every salary route. */
export const isRangeRequest = (from: unknown, to: unknown): boolean => from != null || to != null

/** True when a salary request may run: salary is fully on, or it is a temporary-faculty date-range request. */
export const salaryAllowed = (isRange: boolean): boolean => SALARY_ENABLED || (SALARY_TEMPORARY_ENABLED && isRange)

/** Wording for the screens that stay live while only temporary-faculty pay is on. */
export const SALARY_LABELS = SALARY_ENABLED
  ? { page: 'Salary Calculator', nav: 'Salary', reports: 'Salary Reports', hrLink: 'Salary Calculator', adminLink: 'Salary', adminDesc: 'Calculate & approve pay' }
  : { page: 'Temporary Faculty Salary', nav: 'Temporary Salary', reports: 'Temporary Salary Reports', hrLink: 'Temporary Faculty Salary', adminLink: 'Temporary Salary', adminDesc: 'Pay for temporary faculty' }

export const SALARY_ON_HOLD_MESSAGE =
  'Salary calculation is on hold. Only session entries and reports are available right now.'

/** "Not submitted" days are only tracked from this date; earlier days are never reported as missing. */
export const NOT_SUBMITTED_FROM = '2026-10-01'
