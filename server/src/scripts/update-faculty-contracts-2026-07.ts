/**
 * Non-destructive update for faculty contract changes + new hires (July 2026).
 *
 * Continues on from update-faculty-contracts-2026.ts — same idempotent
 * upsert-by-name pattern, safe to run against production, safe to re-run.
 *
 * Changes in this batch:
 *   - Jidhu: FIXED_MONTHLY_MIN_DAYS -> BASE_OVERTIME_PENALTY. Base salary and
 *     minimums unchanged (18 days, 108 hours); hours beyond 108 now earn an
 *     extra ₹1,200/hr, and the ₹1,10,000 base is now exposed to a ₹7,200
 *     penalty per day short of the 18-day minimum OR per faculty-cancelled
 *     class (whichever is greater, not both — see calculator.ts).
 *   - Afsal Safwan, Shahid, Theertha: were listed as "pending" in the prior
 *     script; contracts now specified below.
 *
 * Run (from server/, with MONGODB_URI pointed at the target database):
 *   npm run update:faculty-contracts-2026-07
 * or directly:
 *   npx tsx --env-file=../.env src/scripts/update-faculty-contracts-2026-07.ts
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { Faculty } from '../models/Faculty'
import { PermanentFacultyContract } from '../models/PermanentFacultyContract'

async function updateExistingContract(
  name: string,
  contractSet: Record<string, unknown>,
  contractUnset: Record<string, ''> = {},
) {
  const faculty = await Faculty.findOne({ name })
  if (!faculty) {
    console.warn(`  SKIP: faculty "${name}" not found — cannot update contract`)
    return
  }
  const update: Record<string, unknown> = { $set: contractSet }
  if (Object.keys(contractUnset).length > 0) update.$unset = contractUnset
  const contract = await PermanentFacultyContract.findOneAndUpdate(
    { facultyId: faculty._id },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  console.log(`  Updated contract for ${name} (${contract.contractType})`)
}

async function upsertNewFaculty(
  facultyData: { name: string; subject: string; type: 'PERMANENT'; salaryModel: string },
  contractSet: Record<string, unknown>,
) {
  const faculty = await Faculty.findOneAndUpdate(
    { name: facultyData.name },
    { $set: facultyData },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  await PermanentFacultyContract.findOneAndUpdate(
    { facultyId: faculty._id },
    { $set: contractSet },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  console.log(`  Upserted ${facultyData.name} (${contractSet.contractType})`)
}

async function main() {
  await connectDB()

  console.log('Updating existing faculty contracts...')

  // Jidhu — new contract type; base salary and minimums (18 days / 108 hours)
  // unchanged. Adds ₹1,200/hr for hours beyond 108, and a ₹7,200 penalty per
  // shortfall day or cancellation (greater of the two, not summed).
  await updateExistingContract('Jidhu', {
    contractType: 'BASE_OVERTIME_PENALTY',
    fixedMonthlySalary: 110000,
    overtimeThresholdHours: 108,
    overtimeRatePerHour: 1200,
    cancellationPenaltyPerClass: 7200,
    minDaysNormal: 18,
    notes: 'Biology. ₹1,10,000 base covering first 108 hrs; +₹1,200/hr beyond that. ' +
      '₹7,200 penalty per day short of the 18-day minimum OR per faculty-cancelled class (greater of the two, capped at the base).',
  }, {
    // No longer used by BASE_OVERTIME_PENALTY — clear so a stale value can't
    // leak into a future contract-type switch for this faculty.
    minHoursRequirement: '',
  })

  console.log('\nAdding new faculty...')

  // Afsal Safwan — Physics, straight hourly.
  await upsertNewFaculty(
    { name: 'Afsal Safwan', subject: 'Physics', type: 'PERMANENT', salaryModel: 'HOURLY' },
    { contractType: 'HOURLY', hourlyRate: 1000, notes: 'Physics. ₹1,000/hr' },
  )

  // Shahid — Chemistry, fixed monthly with an 80-hour minimum (warning-only,
  // no day minimum — mirrors Jidhu's original FIXED_MONTHLY_MIN_DAYS setup).
  await upsertNewFaculty(
    { name: 'Shahid', subject: 'Chemistry', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY' },
    {
      contractType: 'FIXED_MONTHLY_MIN_DAYS',
      fixedMonthlySalary: 55000,
      minHoursRequirement: 80,
      notes: 'Chemistry. ₹55,000 fixed monthly; HR_REVIEW if < 80 hours logged (warning-only, no deduction).',
    },
  )

  // Theertha — Chemistry, base covers first 18 hours, ₹200/hr beyond that.
  await upsertNewFaculty(
    { name: 'Theertha', subject: 'Chemistry', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY' },
    {
      contractType: 'BASE_OVERTIME',
      fixedMonthlySalary: 15000,
      overtimeThresholdHours: 18,
      overtimeRatePerHour: 200,
      notes: 'Chemistry. ₹15,000 base covers first 18 hrs; +₹200/hr beyond that.',
    },
  )

  console.log('\nDone.')
  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
