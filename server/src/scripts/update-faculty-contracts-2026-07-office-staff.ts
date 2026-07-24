/**
 * Non-destructive update: move the five "office staff" faculty onto the new
 * OFFICE_STAFF_LEAVE_BASED contract type (fixed base whether or not they take
 * classes, reduced day-by-day by HR-entered Payable Days, plus extra-hours
 * pay layered on top). Same idempotent upsert-by-name pattern as the other
 * update-faculty-contracts-*.ts scripts — safe to run against production,
 * safe to re-run.
 *
 * IMPORTANT: this only sets the contract terms. Payroll for these five stays
 * BLOCKED (status PENDING_CONFIG) until HR enters that month's Payable Days
 * via the HR → Salary page (or POST /api/hr/salary/payable-days) — there is
 * no attendance data this script can derive that from.
 *
 * Run (from server/, with MONGODB_URI pointed at the target database):
 *   npm run update:office-staff-2026-07
 * or directly:
 *   npx tsx --env-file=../.env src/scripts/update-faculty-contracts-2026-07-office-staff.ts
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { Faculty } from '../models/Faculty'
import { PermanentFacultyContract } from '../models/PermanentFacultyContract'

async function updateContract(name: string, contractSet: Record<string, unknown>) {
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

async function main() {
  await connectDB()

  console.log('Moving office staff onto OFFICE_STAFF_LEAVE_BASED...')

  // Shahid — Chemistry. ₹55,000 base; +₹600/hr beyond 80 hours. No class/doubt split.
  await updateContract('Shahid', {
    contractType: 'OFFICE_STAFF_LEAVE_BASED',
    fixedMonthlySalary: 55000,
    overtimeThresholdHours: 80,
    overtimeRatePerHour: 600,
    notes: 'Chemistry. Office staff: ₹55,000 base, reduced per unpaid day beyond HR-entered Payable Days. +₹600/hr beyond 80 hours.',
  })

  // Manju, Thamanna, Parvathy — doubt-clearance staff, same terms.
  for (const name of ['Manju', 'Thamanna', 'Parvathy']) {
    await updateContract(name, {
      contractType: 'OFFICE_STAFF_LEAVE_BASED',
      fixedMonthlySalary: 20000,
      overtimeThresholdHours: 18,
      overtimeRatePerHour: 300,
      classRatePerHour: 550,
      notes: 'Doubt clearance. Office staff: ₹20,000 base, reduced per unpaid day beyond HR-entered Payable Days. ₹300/hr beyond 18 doubt-clearance hours; ₹550/hr for every class hour.',
    })
  }

  // Theertha — Chemistry. ₹15,000 base; +₹200/hr beyond 18 hours. No class/doubt split.
  await updateContract('Theertha', {
    contractType: 'OFFICE_STAFF_LEAVE_BASED',
    fixedMonthlySalary: 15000,
    overtimeThresholdHours: 18,
    overtimeRatePerHour: 200,
    notes: 'Chemistry. Office staff: ₹15,000 base, reduced per unpaid day beyond HR-entered Payable Days. +₹200/hr beyond 18 hours.',
  })

  console.log('\nDone. Remember: payroll for these five stays blocked until HR enters Payable Days for the month via HR → Salary.')
  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
