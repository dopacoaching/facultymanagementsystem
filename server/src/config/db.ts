import mongoose from 'mongoose'

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI environment variable is required')

  // Reconnect/error events so operational issues surface in logs.
  mongoose.connection.on('disconnected', () => console.warn('[DB] Disconnected from MongoDB'))
  mongoose.connection.on('reconnected',  () => console.info('[DB] Reconnected to MongoDB'))
  mongoose.connection.on('error',        (err) => console.error('[DB] MongoDB error:', err.message))

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })

  // Do NOT log the host/URI — it can leak connection strings in log aggregation.
  console.log('MongoDB connected ✓')
}
