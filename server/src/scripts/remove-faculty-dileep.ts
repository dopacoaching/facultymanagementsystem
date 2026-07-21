/**
 * One-off hard-removal of faculty "Dileep" — no longer employed.
 *
 * Deletes his Faculty record, User login, PermanentFacultyContract, Session
 * history, CarryForwardBalance history, FacultyAvailability entries, and any
 * IS timetable slots / weekly-schedule class entries that reference him.
 *
 * Deliberately does NOT touch AuditLog — it is append-only per AGENTS.md and
 * there is no delete path for it anywhere in this codebase. His historical
 * audit rows (e.g. past salary approvals) remain, referencing a faculty that
 * no longer exists; that's expected and preserves the audit trail's integrity.
 *
 * Safe by default: prints what it WOULD delete and exits. Pass --confirm to
 * actually perform the deletion.
 *
 * Run (from server/, with MONGODB_URI pointed at the target database):
 *   npx tsx --env-file=../.env src/scripts/remove-faculty-dileep.ts            # dry run
 *   npx tsx --env-file=../.env src/scripts/remove-faculty-dileep.ts --confirm  # actually delete
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { Faculty } from '../models/Faculty'
import { User } from '../models/User'
import { PermanentFacultyContract } from '../models/PermanentFacultyContract'
import { Session } from '../models/Session'
import { CarryForwardBalance } from '../models/CarryForwardBalance'
import { FacultyAvailability } from '../models/FacultyAvailability'
import { ISTimetableSlot } from '../models/ISTimetableSlot'
import { WeeklySchedule } from '../models/WeeklySchedule'
import { RefreshToken } from '../models/RefreshToken'

const FACULTY_NAME = 'Dileep'
const CONFIRM = process.argv.includes('--confirm')

async function main() {
  await connectDB()

  const faculty = await Faculty.findOne({ name: FACULTY_NAME })
  if (!faculty) {
    console.log(`No faculty named "${FACULTY_NAME}" found — nothing to do.`)
    await mongoose.disconnect()
    return
  }

  const fId = faculty._id

  const [
    users,
    contract,
    sessionCount,
    carryForwardCount,
    availabilityCount,
    igSlotCount,
    scheduleEntriesCount,
  ] = await Promise.all([
    User.find({ facultyId: fId }),
    PermanentFacultyContract.findOne({ facultyId: fId }),
    Session.countDocuments({ facultyId: fId }),
    CarryForwardBalance.countDocuments({ facultyId: fId }),
    FacultyAvailability.countDocuments({ facultyId: fId }),
    ISTimetableSlot.countDocuments({ facultyId: fId }),
    WeeklySchedule.countDocuments({ 'classEntries.facultyId': fId }),
  ])

  console.log(`Found faculty: ${faculty.name} (${faculty._id}), subject=${faculty.subject}`)
  console.log('Will remove:')
  console.log(`  Faculty record:                 1`)
  console.log(`  User login(s):                  ${users.length}${users.length ? ' (' + users.map((u) => u.username).join(', ') + ')' : ''}`)
  console.log(`  PermanentFacultyContract:        ${contract ? 1 : 0}`)
  console.log(`  Session records:                 ${sessionCount}`)
  console.log(`  CarryForwardBalance records:      ${carryForwardCount}`)
  console.log(`  FacultyAvailability records:      ${availabilityCount}`)
  console.log(`  ISTimetableSlot records:          ${igSlotCount}`)
  console.log(`  WeeklySchedule docs with a class entry referencing him: ${scheduleEntriesCount} (only the matching entries are pulled, not the whole schedule)`)
  console.log('Will NOT touch: AuditLog (append-only — his historical audit rows are preserved as-is).')

  if (!CONFIRM) {
    console.log('\nDry run only — nothing was deleted. Re-run with --confirm to apply.')
    await mongoose.disconnect()
    return
  }

  console.log('\n--confirm passed — deleting now...')

  // RefreshTokens for his user account(s) so any active session is revoked immediately.
  const userIds = users.map((u) => u._id)
  if (userIds.length) {
    await RefreshToken.deleteMany({ userId: { $in: userIds } })
  }

  await Promise.all([
    User.deleteMany({ facultyId: fId }),
    PermanentFacultyContract.deleteMany({ facultyId: fId }),
    Session.deleteMany({ facultyId: fId }),
    CarryForwardBalance.deleteMany({ facultyId: fId }),
    FacultyAvailability.deleteMany({ facultyId: fId }),
    ISTimetableSlot.deleteMany({ facultyId: fId }),
    // Remove only the matching class-entry sub-documents, not the whole weekly schedule.
    WeeklySchedule.updateMany(
      { 'classEntries.facultyId': fId },
      { $pull: { classEntries: { facultyId: fId } } },
    ),
  ])

  await Faculty.deleteOne({ _id: fId })

  console.log('Done. Dileep has been fully removed except for his historical AuditLog entries.')
  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
