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
   see `client/.env.local.example` for the full list:

   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | *(your Atlas string)* |
   | `JWT_SECRET` | *(64-char random — see below)* |
   | `JWT_REFRESH_SECRET` | *(different 64-char random)* |
   | `JWT_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `SEED_ADMIN_USERNAME` | `it@dopacoaching.com` |
   | `SEED_ADMIN_PASSWORD` | *(strong, meets complexity)* |
   | `SALARY_*` | *(all salary values — see `.env.local.example`)* |
   | `NEXT_PUBLIC_API_URL` | *(leave empty — same-origin)* |

   Generate JWT secrets locally:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. Deploy. Vercel builds and redeploys automatically on every push to `main`.

5. **Seed the database once** — run locally with `MONGODB_URI` pointed at Atlas:
   ```bash
   cd server
   MONGODB_URI="<atlas-uri>" npm run seed
   ```
   (The seed script lives in `server/`, but it writes to whatever `MONGODB_URI`
   you point it at — it doesn't need the Express server running.)

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
