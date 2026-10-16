/**
 * One-time migration: Parvathy, Thamanna, Manju and Theertha are shown like any other
 * faculty, under their own subject instead of "Doubt Clearance".
 *
 * Only Faculty.subject changes (contracts and past sessions are left as they are).
 * Idempotent — safe to re-run. Run from server/ with MONGODB_URI set:
 *   npm run migrate:junior-subjects
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'

const SUBJECTS: Record<string, string> = {
  Thamanna: 'Physics',
  Parvathy: 'Physics',
  Manju: 'Biology',
  Theertha: 'Chemistry',
}

async function main() {
  await connectDB()
  const coll = mongoose.connection.db!.collection('faculties')

  for (const [name, subject] of Object.entries(SUBJECTS)) {
    const res = await coll.updateMany({ name }, { $set: { subject } })
    console.log(`${name} -> ${subject}: matched ${res.matchedCount}, modified ${res.modifiedCount}`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
