/**
 * One-time backfill for the from/to date-range report filters (Salary Reports,
 * HR Dashboard, etc.). Those now query SalaryRecord by periodStart/periodEnd
 * overlap regardless of periodType, but existing MONTH-type records approved
 * before this change only have month/year set. This script derives
 * periodStart (first day of month) / periodEnd (last day of month, 23:59:59.999)
 * from month/year for every MONTH record missing them.
 *
 * Idempotent — safe to re-run.
 *
 * Run (from server/, with MONGODB_URI pointed at the target database):
 *   npm run migrate:salary-period-range
 * or directly:
 *   npx tsx --env-file=../.env src/scripts/migrate-salary-record-add-period-range.ts
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { SalaryRecord } from '../models/SalaryRecord'

async function main() {
  await connectDB()

  const candidates = await SalaryRecord.find({
    periodType: 'MONTH',
    $or: [{ periodStart: { $exists: false } }, { periodEnd: { $exists: false } }],
  }).select('_id month year')

  console.log(`Found ${candidates.length} MONTH record(s) missing periodStart/periodEnd.`)

  let updated = 0
  for (const rec of candidates) {
    const periodStart = new Date(rec.year, rec.month - 1, 1)
    const periodEnd = new Date(rec.year, rec.month, 0)
    periodEnd.setHours(23, 59, 59, 999)
    await SalaryRecord.updateOne({ _id: rec._id }, { $set: { periodStart, periodEnd } })
    updated += 1
  }
  console.log(`Backfilled periodStart/periodEnd on ${updated} document(s).`)

  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
