/**
 * One-time migration: Parvathy, Thamanna and Manju are logged as normal faculty,
 * so the Class / Doubt Clearance category picker is switched off for them
 * (Faculty.requiresSessionCategory = false). Nothing else on the faculty or
 * their contracts is touched; existing sessions keep their stored category.
 *
 * Idempotent — safe to re-run. Run from server/ with MONGODB_URI set:
 *   npm run migrate:unset-doubt-category
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'

const NAMES = ['Parvathy', 'Thamanna', 'Manju']

async function main() {
  await connectDB()
  const coll = mongoose.connection.db!.collection('faculties')

  const res = await coll.updateMany(
    { name: { $in: NAMES }, subject: 'Doubt Clearance', requiresSessionCategory: true },
    { $set: { requiresSessionCategory: false } },
  )
  console.log(`Matched ${res.matchedCount}, modified ${res.modifiedCount} of ${NAMES.join(', ')}.`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
