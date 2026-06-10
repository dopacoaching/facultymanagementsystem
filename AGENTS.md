# DOPA Faculty Management System — Agent Notes

Internal tool for DOPA Coaching (Calicut): faculty scheduling, session tracking,
salary calculation, and academics/Integrated-School (IG) management.

## Architecture (important)

Two parallel backends exist — **keep them in sync** when changing business logic:

1. **`client/`** — Next.js 15 App Router. The **production deployment (Vercel)**
   serves API routes from `client/src/app/api/**` which talk to MongoDB Atlas
   directly via `client/src/lib/{models,services}`. `NEXT_PUBLIC_API_URL` is empty
   in production (same-origin `/api`).
2. **`server/`** — Express + Mongoose MVC. Used for local dev against
   `NEXT_PUBLIC_API_URL=http://localhost:5000` and for the alternative
   Netlify + Render deployment (see `DEPLOYMENT.md`).

Shared logic that is duplicated and must stay identical:
- `salary/calculator.ts` (server `src/services` ↔ client `src/lib/services`)
- `integratedSchool/conflictChecker.ts` and `timings.ts`
- Mongoose models (server `src/models` ↔ client `src/lib/models`)

## Commands

- `npm run dev` (root) — runs Express server + Next client concurrently
- `npm run typecheck` (root) — tsc on both projects (run `npx tsc --noEmit`
  inside each folder on Windows; `npm exec --prefix` swallows flags)
- `npm run seed` — seeds users/faculty/batches (uses root `.env`)
- `npm run build` — server tsc + next build

## Key business rules

- Video-first gate: RESIDENTIAL + ONLINE batches need `BatchChapter.videoComplete`
  before a session can be logged.
- Cross-system lock: a faculty cannot have a Repeaters session and an IG
  timetable slot on the same calendar day.
- Schedule weeks run Saturday→Friday; published schedules are immutable —
  changes go through the revise flow (one revision per week).
- Salary preview (`persist=false`) must be pure; only approval writes
  audit logs / carry-forward balances. Carry-forward stores the running
  combined total; surplus months reduce the accumulated deficit.
- AuditLog is append-only — never update or delete audit documents.

## Conventions

- All API responses: `{ error: string }` on failure; mutations require
  Bearer access token; refresh token lives in an httpOnly cookie under
  `/api/auth`.
- ObjectId params are validated before queries; whitelisted field picks
  prevent mass assignment on Faculty/Contract/User updates.
- ISTimetableSlot `(batchId, date, timeSlot)` uniqueness is enforced at the
  application layer (cancelled slots are excluded) — do NOT add a unique index.
