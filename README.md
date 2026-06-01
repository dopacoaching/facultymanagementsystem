# DOPA Faculty Management System

Full-stack faculty management system for DOPA Coaching (Calicut) — salary/payroll,
session tracking, academic scheduling, exam-topic suggestions, and Integrated School
timetabling.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | Next.js 15 (App Router) · Redux Toolkit · React Hook Form · TypeScript |
| Backend  | Express · Mongoose · JWT auth · TypeScript |
| Database | MongoDB (Atlas in production) |
| Hosting  | Netlify (client) · Render/Railway (API) · MongoDB Atlas (DB) |

## Project structure

```
faculty-management-system/
├── client/       # Next.js frontend
├── server/       # Express API
├── netlify.toml  # Netlify build config (client)
└── DEPLOYMENT.md
```

## Local development

### 1. Server

```bash
cd server
cp .env.example .env        # fill in MONGODB_URI, JWT secrets, seed values
npm install
npm run seed                # creates users + faculty + chapters
npm run dev                 # http://localhost:5000
```

### 2. Client

```bash
cd client
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL + coordinator token
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
| Faculty | `/login` | `ashraf_ac` … `dileep` |

Passwords are set via `SEED_*_PASSWORD` env vars and must meet the complexity
policy (8–64 chars, upper, lower, digit, special char).

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for full Netlify + Render + MongoDB Atlas steps.

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
