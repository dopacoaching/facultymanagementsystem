/**
 * One-off migration: set stream and ig1Subgroup on specific IG batches.
 * Run once, then delete.
 *
 *   npm run set-ig-stream          (from server/)
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { Batch } from '../models/Batch'

const UPDATES: { name: string; stream: 'NEET' | 'JEE'; ig1Subgroup: 'PLUS_ONE' | 'PLUS_TWO' }[] = [
  { name: 'S3', stream: 'JEE', ig1Subgroup: 'PLUS_ONE' },
  { name: 'R3', stream: 'JEE', ig1Subgroup: 'PLUS_TWO' },
]

async function run() {
  await connectDB()
  console.log('Updating IG batch stream/subgroup...\n')

  for (const u of UPDATES) {
    const result = await Batch.findOneAndUpdate(
      { name: u.name, type: 'IG' },
      { $set: { stream: u.stream, ig1Subgroup: u.ig1Subgroup } },
      { new: true },
    )
    if (result) {
      console.log(`  ✓ ${result.name} → stream=${result.stream}, ig1Subgroup=${result.ig1Subgroup}`)
    } else {
      console.warn(`  ✗ Batch "${u.name}" not found (type=IG)`)
    }
  }

  console.log('\nDone.')
  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
