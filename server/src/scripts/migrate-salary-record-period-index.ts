/**
 * One-time migration for date-range (from/to) salary approval of TEMPORARY faculty.
 *
 * SalaryRecord gained `periodType` ('MONTH' | 'RANGE'), `periodStart`, `periodEnd`.
 * The old plain-unique index { facultyId, month, year } would stop a temporary
 * faculty from having more than one approved date-window record that derives the
 * same month/year, so it is replaced by a PARTIAL unique index scoped to
 * periodType === 'MONTH'.
 *
 * Steps (idempotent — safe to re-run):
 *   1. Backfill every existing document with periodType: 'MONTH' so the partial
 *      unique index covers them.
 *   2. Drop the legacy index facultyId_1_month_1_year_1 if it is still present.
 *   3. syncIndexes() rebuilds from the current schema: partial-unique on
 *      { facultyId, month, year } (periodType 'MONTH') AND partial-unique on
 *      { facultyId, periodStart, periodEnd } (periodType 'RANGE'). The RANGE
 *      unique index makes concurrent double-approval of the same date window
 *      fail with E11000 instead of inserting a second APPROVED record. If a DB
 *      already holds duplicate RANGE windows, syncIndexes() will throw — dedupe
 *      those documents first, then re-run.
 *
 * Run (from server/, with MONGODB_URI pointed at the target database):
 *   npm run migrate:salary-period
 * or directly:
 *   npx tsx --env-file=../.env src/scripts/migrate-salary-record-period-index.ts
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { SalaryRecord } from '../models/SalaryRecord'

const LEGACY_INDEX = 'facultyId_1_month_1_year_1'

async function main() {
  await connectDB()
  const coll = SalaryRecord.collection

  // 1. Backfill periodType on legacy documents.
  const res = await coll.updateMany(
    { periodType: { $exists: false } },
    { $set: { periodType: 'MONTH' } },
  )
  console.log(`Backfilled periodType: 'MONTH' on ${res.modifiedCount} document(s).`)

  // 2. Drop the legacy plain-unique index if it still exists.
  const indexes = await coll.indexes()
  if (indexes.some((ix) => ix.name === LEGACY_INDEX)) {
    await coll.dropIndex(LEGACY_INDEX)
    console.log(`Dropped legacy index ${LEGACY_INDEX}.`)
  } else {
    console.log(`Legacy index ${LEGACY_INDEX} not present — nothing to drop.`)
  }

  // 3. Rebuild indexes from the current schema definition.
  await SalaryRecord.syncIndexes()
  console.log('syncIndexes() complete. Current indexes:')
  for (const ix of await coll.indexes()) {
    console.log(`  ${ix.name}`, JSON.stringify(ix.key), ix.unique ? '(unique)' : '', ix.partialFilterExpression ? `partial: ${JSON.stringify(ix.partialFilterExpression)}` : '')
  }

  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
