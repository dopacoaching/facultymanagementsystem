/**
 * One-off migration: replace individual class-teacher (COORDINATOR) logins with
 * 14 shared campus logins — one email + one common password per campus, with the
 * actual person picked from an in-form "Updated by" dropdown instead.
 *
 * Idempotent / safe to re-run: upserts the 14 campus accounts by username, and
 * deactivates (never deletes) any existing COORDINATOR/IG_COORDINATOR account
 * that isn't one of them.
 *
 * Run (from server/, with MONGODB_URI pointed at the target database):
 *   npm run create:campus-teacher-logins
 * or directly:
 *   npx tsx --env-file=../.env src/scripts/create-campus-teacher-logins.ts
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { connectDB } from '../config/db'
import { User } from '../models/User'

const COMMON_PASSWORD = 'dopafaculty@1234'

const CAMPUSES = [
  { campusName: 'Kottakkal Boys',          username: 'doparesidentialkottakkalboys@gmail.com' },
  { campusName: 'Online Repeat',           username: 'dopaonlineacademics@gmail.com' },
  { campusName: 'Feroke Girls',            username: 'dopaferokegirlsresidential@gmail.com' },
  { campusName: 'Narikkuni Girls',         username: 'narikkunigirls@gmail.com' },
  { campusName: 'PVT Girls',               username: 'pvt1aims@gmail.com' },
  { campusName: 'CLT Offline',             username: 'dopacltoffline102@gmail.com' },
  { campusName: 'IG 1',                    username: 'alpsacademykerala@gmail.com' },
  { campusName: 'Thrissur Residential',    username: 'dopathrissurresidential@gmail.com' },
  { campusName: 'Calicut Boys',            username: 'dopaaiimsboys@gmail.com' },
  { campusName: 'Kottakkal Girls',         username: 'chattiparambdopa@gmail.com' },
  { campusName: 'Kottakkal Offline',       username: 'kottakkalofflineaacademics@gmail.com' },
  { campusName: 'Thrissur Offline',        username: 'dopathrissuracc@gmail.com' },
  { campusName: 'IG 2',                    username: 'dopamalabar@gmail.com' },
  { campusName: 'Kottakkal Offline Tamil', username: 'dopatamilrepeaters@gmail.com' },
  { campusName: 'Studio',                  username: 'studiodopa5@gmail.com' },
]

async function run() {
  await connectDB()
  console.log('Creating/updating campus class-teacher logins...\n')

  const passwordHash = await bcrypt.hash(COMMON_PASSWORD, 12)
  const createdUsernames: string[] = []

  for (const c of CAMPUSES) {
    const username = c.username.toLowerCase()
    const result = await User.findOneAndUpdate(
      { username },
      {
        $set: {
          username,
          passwordHash,
          role: 'COORDINATOR',
          campusName: c.campusName,
          isActive: true,
        },
        $unset: { batchId: '', batchType: '' },
      },
      { upsert: true, new: true },
    )
    createdUsernames.push(username)
    console.log(`  ✓ ${c.campusName.padEnd(24)} ${username}`)
    void result
  }

  const deactivated = await User.updateMany(
    {
      role: { $in: ['COORDINATOR', 'IG_COORDINATOR'] },
      username: { $nin: createdUsernames },
      isActive: true,
    },
    { $set: { isActive: false } },
  )
  console.log(`\nDeactivated ${deactivated.modifiedCount} old individual class-teacher account(s).`)

  console.log('\nDone.')
  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
