import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

// Register all Mongoose models before any route handler runs (needed for populate())
import './models/index'

import authRoutes from './routes/auth.routes'
import hrRoutes from './routes/hr.routes'
import academicsRoutes from './routes/academics.routes'
import isRoutes from './routes/integratedSchool.routes'
import adminRoutes from './routes/admin.routes'

const app = express()

// Behind a hosting proxy (Render/Netlify/Heroku), trust the first proxy hop so
// req.ip reflects the real client (needed for correct per-IP rate limiting) and
// secure cookies are handled correctly.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS ──────────────────────────────────────────────────────────────────────
// In production only the explicit CLIENT_URL is allowed.
// In development, common Next.js dev ports are also permitted.
const isProd = process.env.NODE_ENV === 'production'
const allowedOrigins: string[] = isProd
  ? [process.env.CLIENT_URL!]
  : [
      process.env.CLIENT_URL ?? 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ]

if (isProd && !process.env.CLIENT_URL) {
  console.error('FATAL: CLIENT_URL environment variable is required in production.')
  // Don't process.exit — let requests fail with CORS errors rather than killing the process
}

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, mobile)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  // Expose so the client can read the refreshed access token header set by authenticate()
  exposedHeaders: ['X-Refreshed-Token'],
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
// 100 kb limit: small enough to deter large-payload DoS, large enough for the
// biggest legitimate payload (a weekly schedule with dozens of class entries).
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Strict limit on auth routes to mitigate brute-force / credential stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again in 15 minutes.' },
  skipSuccessfulRequests: false,
})

// Broad limit on all API routes to cap server load.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
})

// Refresh fires automatically every ~15 min per signed-in user; a shared office
// IP (NAT) with several staff would exhaust the strict 20/15min login limit, so
// it gets its own, more generous budget.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again shortly.' },
})

app.use('/api/auth/login',   authLimiter)
app.use('/api/auth/refresh', refreshLimiter)
app.use('/api',              apiLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', authRoutes)
app.use('/api/hr', hrRoutes)
app.use('/api/academics', academicsRoutes)
app.use('/api/ig', isRoutes)
app.use('/api/admin', adminRoutes)

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error & { name?: string; code?: number | string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Mongoose validation errors → 400 Bad Request
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message })
    return
  }
  // Mongoose duplicate-key errors → 409 Conflict
  if (err.name === 'MongoServerError' && err.code === 11000) {
    res.status(409).json({ error: 'Duplicate entry — a record with that value already exists.' })
    return
  }
  // Log the full error internally; never expose details to the client in production.
  console.error('[ERROR]', err.stack ?? err.message)
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message ?? 'Internal server error'),
  })
})

export default app
