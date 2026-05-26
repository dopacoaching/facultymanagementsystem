import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { connectDB } from './config/db'

// Register all Mongoose models before any route handler runs (needed for populate())
import './models/index'

import authRoutes from './routes/auth.routes'
import hrRoutes from './routes/hr.routes'
import academicsRoutes from './routes/academics.routes'
import isRoutes from './routes/integratedSchool.routes'
import adminRoutes from './routes/admin.routes'

const app = express()

const allowedOrigins = [
  process.env.CLIENT_URL ?? 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', authRoutes)
app.use('/api/hr', hrRoutes)
app.use('/api/academics', academicsRoutes)
app.use('/api/integrated-school', isRoutes)
app.use('/api/admin', adminRoutes)

// Global error handler
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
  console.error(err.stack)
  res.status(500).json({ error: err.message ?? 'Internal server error' })
})

const PORT = Number(process.env.PORT ?? 5000)

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('DB connection failed:', err)
    process.exit(1)
  })

export default app
