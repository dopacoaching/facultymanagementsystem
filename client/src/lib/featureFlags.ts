/**
 * Weekly Scheduling — live in production, but ADMIN-only.
 *
 * The Weekly Schedule editor (`/scheduling`) and every mutating
 * `/api/academics/schedules/**` endpoint are restricted to the ADMIN role in
 * their own handlers; this flag only decides whether the feature exists at all.
 * It defaults to ON so production serves it. Set
 * `NEXT_PUBLIC_SCHEDULING_ENABLED=false` in an environment to kill-switch it.
 *
 * `NEXT_PUBLIC_*` is inlined at build time and readable from both client
 * components and route handlers.
 */
export const SCHEDULING_ENABLED = process.env.NEXT_PUBLIC_SCHEDULING_ENABLED !== 'false'
