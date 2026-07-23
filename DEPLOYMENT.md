# Deployment Guide

Production is a **single Next.js deployment on Vercel**. The app under
`client/` serves both the UI and the API (`client/src/app/api/**`), talking to
MongoDB Atlas directly via `client/src/lib/{models,services}`. There is no
separate API service to deploy or link — `NEXT_PUBLIC_API_URL` stays empty in
production and all requests are same-origin (`/api/...`).

`server/` (Express + Mongoose) is **not deployed**. It exists only as a local-dev
mirror of the same business logic — see `AGENTS.md` for which files must stay
in sync.

---

## Step 0 — Push to GitHub

```bash
cd faculty-management-system
git add -A
git commit -m "your message"
git push origin main
```

Confirm **no `.env` files were committed**:
```bash
git ls-files | grep ".env"     # should show ONLY *.env.example / .env.local.example
```

---

## Step 1 — MongoDB Atlas (database)

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. **Database Access** → add a user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (Vercel's IPs are dynamic).
4. **Connect** → "Connect your application" → copy the connection string:
   ```
   mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/dopa_fms?retryWrites=true&w=majority
   ```
   Keep this for `MONGODB_URI`.

---

## Step 2 — Deploy to Vercel

1. Go to <https://vercel.com> → **Add New** → **Project** → import the GitHub repo.
2. Set **Root Directory** to `client` (Vercel auto-detects the Next.js framework —
   `client/vercel.json` already declares `"framework": "nextjs"`).
3. Add **Environment Variables** (Project Settings → Environment Variables) —
   only these are ever read by the running app:

   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | *(your Atlas string)* |
   | `JWT_SECRET` | *(64-char random — see below)* |
   | `JWT_REFRESH_SECRET` | *(different 64-char random)* |
   | `JWT_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `NEXT_PUBLIC_API_URL` | *(leave empty — same-origin)* |

   Generate JWT secrets locally:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

   `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, and every `SALARY_*` variable
   in `client/.env.local.example` are **not** used by the deployed app —
   they're read only by `server/src/seed.ts`, a one-off script you run from
   your own machine (see Step 5 below). Don't add them to Vercel; they'd just
   be dead config.

4. Deploy. Vercel builds and redeploys automatically on every push to `main`.

5. **Seed the database once** — run locally with `MONGODB_URI` (and, if you
   want non-default values, `SEED_*`/`SALARY_*`) pointed at Atlas:
   ```bash
   cd server
   cp .env.example .env   # fill in MONGODB_URI (Atlas) + SEED_*/SALARY_* overrides
   npm run seed
   ```
   (The seed script lives in `server/`, but it writes to whatever `MONGODB_URI`
   is in `server/.env` — it doesn't need the Express server running, and
   nothing here needs to be set in Vercel.) Faculty added or changed after the
   initial seed go through the non-destructive scripts in
   `server/src/scripts/update-faculty-contracts-*.ts` instead — `npm run seed`
   is destructive (wipes and rebuilds Users/Faculty/Batches/Chapters) and
   should only be used once, against a fresh database.

---

## Step 3 — Verify

1. Open your Vercel URL → `/login`.
2. Log in as a seeded manager account.
3. Confirm:
   - Dashboard data loads (no console errors)
   - Refresh works after 15 min (no forced logout)
   - Admin login works at `/admin/login`

---

## Cookie notes

Since the client and API are same-origin on Vercel, the refresh-token cookie
uses `sameSite='lax'`-style same-site semantics — no cross-domain CORS or
cookie configuration is needed. `NODE_ENV=production` is set automatically by
Vercel.
