/**
 * One-time migration: deactivate the "Feroke Girls IS" batch in MongoDB Atlas.
 *
 * Run from the client/ directory:
 *   npx tsx scripts/deactivate-feroke-is.ts
 *
 * The batch is marked isActive=false rather than deleted so existing session
 * and timetable records that reference its _id remain intact.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import mongoose from 'mongoose'
import { Batch } from '../../server/src/models/Batch'

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is required in .env.local')

async function run() {
  await mongoose.connect(uri!, { serverSelectionTimeoutMS: 10_000 })
  console.log('MongoDB connected ✓')

  const result = await Batch.updateOne(
    { name: 'Feroke Girls IS', type: 'IG' },
    { $set: { isActive: false } },
  )

  if (result.matchedCount === 0) {
    console.log('Batch "Feroke Girls IS" not found — nothing to do.')
  } else {
    console.log(`Batch "Feroke Girls IS" deactivated (modified: ${result.modifiedCount}).`)
  }

  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
