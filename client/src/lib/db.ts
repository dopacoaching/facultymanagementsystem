import mongoose from 'mongoose'

// Import all models so Mongoose registers them before any populate() call runs
import '@/lib/models/index'

const uri = process.env.MONGODB_URI!

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null }
}
const cache = global._mongooseCache

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
      .catch((err) => {
        cache.promise = null // reset so the next request retries the connection
        throw err
      })
  }
  cache.conn = await cache.promise
  return cache.conn
}
