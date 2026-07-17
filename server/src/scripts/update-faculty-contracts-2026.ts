/**
 * Non-destructive update for faculty contract changes + new hires (2026).
 *
 * Unlike seed.ts, this script does NOT delete anything — it only upserts the
 * specific faculty/contract documents listed below by name. Safe to run
 * against production. Re-runnable (idempotent).
 *
 * Run (from server/, with MONGODB_URI pointed at the target database):
 *   npm run update:faculty-contracts-2026
 * or directly:
 *   npx tsx --env-file=../.env src/scripts/update-faculty-contracts-2026.ts
 *
 * Pending (subject/rule not yet specified — intentionally NOT included here):
 *   Afsal Safwan, Shahid, Theertha
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { Faculty } from '../models/Faculty'
import { PermanentFacultyContract } from '../models/PermanentFacultyContract'

async function updateExistingContract(name: string, contractSet: Record<string, unknown>) {
  const faculty = await Faculty.findOne({ name })
  if (!faculty) {
    console.warn(`  SKIP: faculty "${name}" not found — cannot update contract`)
    return
  }
  const contract = await PermanentFacultyContract.findOneAndUpdate(
    { facultyId: faculty._id },
    { $set: contractSet },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  console.log(`  Updated contract for ${name} (${contract.contractType})`)
}

async function upsertNewFaculty(
  facultyData: { name: string; subject: string; type: 'PERMANENT'; salaryModel: string; requiresSessionCategory?: boolean },
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

  // Ashraf AC — unchanged pay, new 26-day minimum (warning-only, no deduction)
  await updateExistingContract('Ashraf AC', {
    contractType: 'FIXED_QUOTA_CARRYFORWARD',
    fixedMonthlySalary: 400000,
    monthlyHourQuota: 120,
    hasCarryForward: true,
    minDaysNormal: 26,
  })

  // Dr. Dunoonul Shibli — figures unchanged (₹50k fixed + ₹1.5L variable = ₹2L total);
  // day-shortfall penalty behavior is now built into the SPLIT_FIXED_VARIABLE handler itself
  await updateExistingContract('Dr. Dunoonul Shibli', {
    contractType: 'SPLIT_FIXED_VARIABLE',
    fixedComponent: 50000,
    variableComponent: 150000,
    cancellationPenaltyPerClass: 9000,
    minDaysNormal: 16,
    minHoursRequirement: 96,
  })

  // Muneeb Haneefa C — rate increase 1150 -> 1250/hr, min-days unchanged
  await updateExistingContract('Muneeb Haneefa C', {
    contractType: 'HOURLY_MIN_DAYS',
    hourlyRate: 1250,
    minDaysNormal: 22,
    minDaysDryMonths: 10,
    dryMonths: [2, 3, 5],
  })

  // Anoop K — contract type changes to SPLIT_FIXED_VARIABLE (fixedComponent 0, all
  // ₹2L subject to the day-shortfall/cancellation penalty, same rules as Shibli)
  await updateExistingContract('Anoop K', {
    contractType: 'SPLIT_FIXED_VARIABLE',
    fixedComponent: 0,
    variableComponent: 200000,
    cancellationPenaltyPerClass: 9000,
    minDaysNormal: 16,
    minHoursRequirement: 96,
  })

  // Muhammed Ashique EK — contract type changes from leave-allowance model to a
  // 22-day minimum model (warning-only, no deduction); pay unchanged at 75,000
  await updateExistingContract('Muhammed Ashique EK', {
    contractType: 'FIXED_MONTHLY_MIN_DAYS',
    fixedMonthlySalary: 75000,
    minDaysNormal: 22,
  })

  // Hisham Abdul Kadir NP — rate increase 900 -> 1050/hr
  await updateExistingContract('Hisham Abdul Kadir NP', {
    contractType: 'HOURLY',
    hourlyRate: 1050,
  })

  // Habid PP ("Abid") — unchanged, included for completeness
  await updateExistingContract('Habid PP', {
    contractType: 'HOURLY',
    hourlyRate: 1100,
  })

  console.log('\nAdding new faculty...')

  // Jidhu — Biology, fixed monthly with min 18 days AND min 108 hours (warning-only)
  await upsertNewFaculty(
    { name: 'Jidhu', subject: 'Biology', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY' },
    {
      contractType: 'FIXED_MONTHLY_MIN_DAYS',
      fixedMonthlySalary: 110000,
      minDaysNormal: 18,
      minHoursRequirement: 108,
    },
  )

  // Promod — Physics. At/above 135h: ₹20,000 + ₹1,800/hr overtime.
  // Below 135h: pay is hoursLogged × ₹2,000/hr instead (replaces the flat ₹20,000).
  await upsertNewFaculty(
    { name: 'Promod', subject: 'Physics', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY' },
    {
      contractType: 'BASE_OVERTIME_SHORTFALL',
      fixedMonthlySalary: 20000,
      overtimeThresholdHours: 135,
      overtimeRatePerHour: 1800,
      shortfallRatePerHour: 2000,
    },
  )

  // Parvathy, Thamanna, Manju — doubt clearance staff. ₹20,000 flat for up to 18
  // doubt-clearance hours, ₹300/hr beyond that; separately, ₹550/hr for every
  // regular "Class" hour. Subject set to "Doubt Clearance" (their role, not a
  // guessed academic subject) — adjust via the faculty edit screen if needed.
  for (const name of ['Parvathy', 'Thamanna', 'Manju']) {
    await upsertNewFaculty(
      { name, subject: 'Doubt Clearance', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', requiresSessionCategory: true },
      {
        contractType: 'DOUBT_CLEARANCE_SPLIT_RATE',
        fixedMonthlySalary: 20000,
        overtimeThresholdHours: 18,
        overtimeRatePerHour: 300,
        classRatePerHour: 550,
      },
    )
  }

  console.log('\nDone. Still pending (not touched by this script): Afsal Safwan, Shahid, Theertha.')
  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
