/**
 * Weekly Scheduling — dev-only until explicitly enabled in production.
 *
 * `NEXT_PUBLIC_*` is inlined at build time and readable from both client
 * components and route handlers. Set `NEXT_PUBLIC_SCHEDULING_ENABLED=true` in
 * `client/.env.local` for local dev; leave it unset in Vercel so production
 * keeps the scheduling UI and its mutating API endpoints hidden.
 */
export const SCHEDULING_ENABLED = process.env.NEXT_PUBLIC_SCHEDULING_ENABLED === 'true'
