# DOPA Faculty Management System — Agent Notes

Internal tool for DOPA Coaching (Calicut): faculty management, session tracking,
salary calculation, and academics/Integrated-School (IG) management.

## Architecture (important)

Two parallel backends exist — **keep them in sync** when changing business logic:

1. **`client/`** — Next.js 15 App Router. The **production deployment (Vercel)**
   serves API routes from `client/src/app/api/**` which talk to MongoDB Atlas
   directly via `client/src/lib/{models,services}`. `NEXT_PUBLIC_API_URL` is empty
   in production (same-origin `/api`).
2. **`server/`** — Express + Mongoose MVC. Local-dev only (run against
   `NEXT_PUBLIC_API_URL=http://localhost:5000`); it is never deployed. See
   `DEPLOYMENT.md` for the single-target Vercel deployment.

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

- Roles: ADMIN, HR_MANAGER, CLASS_TEACHER, IG_CLASS_TEACHER, FACULTY. The
  Academics Manager / IG Academics Manager roles were removed (Sept 2026);
  accounts still holding them are refused at login/SSO/refresh until reassigned.
- **Salary is ON HOLD (Oct 2026):** only entries + reports are live. `SALARY_ENABLED`
  (`client/src/lib/constants/features.ts`, env `NEXT_PUBLIC_SALARY_ENABLED=true`) hides
  the salary UI and makes `/api/hr/salary/**` return 503. No salary code/data was removed.
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
