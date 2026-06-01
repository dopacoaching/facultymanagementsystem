# Deployment Guide

This app has **two deployable pieces**:

1. **Client** (Next.js) → **Netlify**
2. **API server** (Express) → **Render** (or Railway/Fly.io)
3. **Database** → **MongoDB Atlas**

Netlify cannot host the Express server — it only runs the Next.js frontend. The
API must be deployed separately, and the two are linked via environment variables.

---

## Step 0 — Push to GitHub

```bash
cd faculty-management-system
git add -A
git commit -m "chore: deployment configs for Netlify + Render"
git push origin main      # or your branch
```

Confirm **no `.env` files were committed**:
```bash
git ls-files | grep ".env"     # should show ONLY *.env.example files
```

---

## Step 1 — MongoDB Atlas (database)

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. **Database Access** → add a user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — Render's IPs are dynamic).
4. **Connect** → "Connect your application" → copy the connection string:
   ```
   mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/dopa_fms?retryWrites=true&w=majority
   ```
   Keep this for `MONGODB_URI`.

---

## Step 2 — Deploy the API server (Render)

1. Go to <https://render.com> → **New** → **Web Service** → connect your GitHub repo.
2. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/app.js`
   - **Instance type**: Free
3. Add **Environment Variables** (Dashboard → Environment):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | *(your Atlas string)* |
   | `JWT_SECRET` | *(64-char random — see below)* |
   | `JWT_REFRESH_SECRET` | *(different 64-char random)* |
   | `JWT_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | *(your Netlify URL — set after Step 3)* |
   | `SEED_ADMIN_USERNAME` | `it@dopacoaching.com` |
   | `SEED_HR_USERNAME` | `admin_hr` |
   | `SEED_REPEATERS_USERNAME` | `repeaters` |
   | `SEED_IS_ACADEMIC_USERNAME` | `academicis` |
   | `SEED_ADMIN_PASSWORD` | *(strong, meets complexity)* |
   | `SEED_MGMT_PASSWORD` | *(strong, meets complexity)* |
   | `SEED_FACULTY_PASSWORD` | *(strong, meets complexity)* |
   | `SALARY_*` | *(all salary values — see `.env.example`)* |

   Generate JWT secrets locally:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. Deploy. Note the URL, e.g. `https://dopa-fms-api.onrender.com`.

5. **Seed the database once** — Render Dashboard → your service → **Shell**:
   ```bash
   npm run seed
   ```
   (Or run locally with `MONGODB_URI` pointed at Atlas.)

---

## Step 3 — Deploy the client (Netlify)

1. Go to <https://app.netlify.com> → **Add new site** → **Import from Git** → select your repo.
2. Netlify auto-detects `netlify.toml`. Confirm:
   - **Base directory**: `client`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `.next` (handled by the Next.js plugin)
3. Add **Environment Variables** (Site settings → Environment variables):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://dopa-fms-api.onrender.com` *(your Render URL, no trailing slash)* |
   | `NEXT_PUBLIC_COORDINATOR_TOKEN` | *(long random string — `openssl rand -hex 24`)* |

4. Deploy. Note your site URL, e.g. `https://dopa-fms.netlify.app`.

---

## Step 4 — Link the two (critical)

1. Go back to **Render** → Environment → set:
   ```
   CLIENT_URL = https://dopa-fms.netlify.app
   ```
   (exact Netlify URL, no trailing slash). This is required for CORS **and** for
   the cross-site refresh cookie to work.
2. Trigger a redeploy of the Render service so the new `CLIENT_URL` takes effect.

---

## Step 5 — Verify

1. Open your Netlify URL → `/login`.
2. Log in as `admin_hr` with `SEED_MGMT_PASSWORD`.
3. Confirm:
   - Dashboard data loads (no CORS errors in console)
   - Refresh works after 15 min (no forced logout)
   - Admin login works at `/admin/login`

---

## Cross-domain cookie notes

Because the client and API are on different domains, the refresh-token cookie uses
`sameSite='none'; secure=true` in production (set automatically when
`NODE_ENV=production`). This requires **both** sites to be served over HTTPS —
Netlify and Render both provide HTTPS by default, so no extra config is needed.

If login works but the user is logged out after 15 minutes, the cookie is being
blocked — verify:
- `NODE_ENV=production` is set on Render
- `CLIENT_URL` exactly matches the Netlify origin
- Both URLs are `https://`

---

## Render free-tier cold starts

The free Render instance sleeps after 15 minutes of inactivity; the first request
after sleep takes ~30–50 s. For production use, upgrade to a paid instance or add
an uptime pinger (e.g. UptimeRobot hitting `/health`).
