import 'dotenv/config'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { connectDB } from '../src/config/db'
import app from '../src/app'

// Singleton DB connection — Vercel reuses warm instances between requests
let connectionPromise: Promise<void> | null = null

function ensureDB(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((err) => {
      connectionPromise = null // reset so the next cold start retries
      throw err
    })
  }
  return connectionPromise
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureDB()
  } catch (err) {
    console.error('DB connection failed:', err)
    res.status(503).json({ error: 'Service temporarily unavailable' })
    return
  }
  // Delegate to Express
  return new Promise<void>((resolve) => {
    app(req as never, res as never, () => resolve())
    res.on('finish', resolve)
  })
}
