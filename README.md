# DOPA Faculty Management System

Full-stack faculty management system for DOPA Coaching (Calicut) — salary/payroll,
session tracking, academic scheduling, exam-topic suggestions, and Integrated School
timetabling.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | Next.js 15 (App Router) · Redux Toolkit · React Hook Form · TypeScript |
| Backend  | Next.js API routes (`client/src/app/api`) talking to MongoDB via Mongoose · JWT auth |
| Database | MongoDB (Atlas in production) |
| Hosting  | Vercel (single Next.js deployment) · MongoDB Atlas (DB) |

## Project structure

```
faculty-management-system/
├── client/       # Next.js app — UI + API routes; the production deployment
├── server/       # Express API — local-dev mirror only (see AGENTS.md)
└── DEPLOYMENT.md
```

Production runs entirely out of `client/` on Vercel (`NEXT_PUBLIC_API_URL` empty,
same-origin `/api`). `server/` is an Express+Mongoose mirror used for local
development and must be kept logically in sync with `client/src/lib` — see
`AGENTS.md` for which files are duplicated.

## Local development

### Option A — Next.js only (matches production)

```bash
cd client
cp .env.local.example .env.local   # fill in MONGODB_URI, JWT secrets, seed values
npm install
npm run dev                 # http://localhost:3000, API routes at /api
```

### Option B — Express server + Next.js client (dual backend)

```bash
cd server
cp .env.example .env        # fill in MONGODB_URI, JWT secrets, seed values
npm install
npm run seed                # creates users + faculty + chapters
npm run dev                 # http://localhost:5000
```

```bash
cd client
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:3000
```

## Roles & login

| Role | Login page | Seeded username |
|------|-----------|-----------------|
| Admin | `/admin/login` | `SEED_ADMIN_USERNAME` (e.g. it@dopacoaching.com) |
| HR Manager | `/login` | `admin_hr` |
| Academics Manager | `/login` | `repeaters` |
| IS Academics Manager | `/login` | `academicis` |
| Coordinators | `/login` | `coordinator_calicut`, `coordinator_melmuri`, `coordinator_ayikk` |
| Faculty | `/login` | one per faculty, created via Admin → Users (e.g. `ashraf_ac`) |

Passwords are set via `SEED_*_PASSWORD` env vars and must meet the complexity
policy (8–64 chars, upper, lower, digit, special char).

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the Vercel + MongoDB Atlas steps.

## Security

This codebase has undergone a security audit. Key protections:
- JWT access tokens (15 min) + httpOnly refresh tokens (7 days) with server-side
  revocation and rotation
- Rate limiting on auth + global API
- Helmet security headers, env-aware CORS
- Mass-assignment whitelists on all write endpoints
- Append-only audit log
- Password complexity enforcement

All secrets live in environment variables and are never committed.
