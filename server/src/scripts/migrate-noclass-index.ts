/**
 * One-time migration for batch-level "No Class" markers.
 *
 * A campus with several batches can now have more than one No Class marker on
 * the same day (each with its own batches and reason), so the old UNIQUE index
 * { campusName, date } on `noclassdays` is replaced by a plain index with the
 * same keys. The API keeps a batch in at most one marker per day.
 *
 * Idempotent — safe to re-run. Run on deploy (from server/, MONGODB_URI set):
 *   npm run migrate:noclass-index
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'

const KEYS = { campusName: 1, date: 1 }

async function main() {
  await connectDB()
  const coll = mongoose.connection.db!.collection('noclassdays')

  const indexes = await coll.indexes().catch(() => [])   // collection may not exist yet
  const legacy = indexes.find((ix) => JSON.stringify(ix.key) === JSON.stringify(KEYS) && ix.unique)
  if (legacy?.name) {
    await coll.dropIndex(legacy.name)
    console.log(`Dropped unique index ${legacy.name}.`)
  } else {
    console.log('No unique { campusName, date } index found — nothing to drop.')
  }
  await coll.createIndex(KEYS)
  console.log('Ensured non-unique index { campusName: 1, date: 1 }.')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
