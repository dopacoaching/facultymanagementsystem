import { config } from 'dotenv'
// Load .env.local before any other imports so env vars are available
config({ path: '.env.local' })

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

/**
 * Creates a joint-entry login — the one account allowed to enter a class taught to several
 * IG schools (IG_JOINT_TEACHER) or several repeaters campuses (REPEATERS_JOINT_TEACHER) at once. It gets the same shared password as the campus
 * teacher logins, read from the campus-login script so the password is not copied here.
 *
 * An existing account is never overwritten unless --force is given (it prints the current role).
 *
 * Run:  npx tsx scripts/create-ig-joint-login.ts <email> [IG_JOINT_TEACHER|REPEATERS_JOINT_TEACHER] [--force]
 */
async function run() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const force = process.argv.includes('--force')
  const username = args[0]?.trim().toLowerCase()
  const role = args[1] ?? 'IG_JOINT_TEACHER'
  if (!username) throw new Error('Usage: create-ig-joint-login.ts <email> [role] [--force]')
  if (role !== 'IG_JOINT_TEACHER' && role !== 'REPEATERS_JOINT_TEACHER') throw new Error('Unknown role ' + role)
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')

  const source = readFileSync(resolve(__dirname, '../../server/src/scripts/create-campus-teacher-logins.ts'), 'utf8')
  const match = source.match(/COMMON_PASSWORD\s*=\s*(['"`])(.+?)\1/)
  if (!match) throw new Error('Could not read the shared teacher password')
  const passwordHash = await bcrypt.hash(match[2], 12)

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
  const users = mongoose.connection.db!.collection('users')
  const existing = await users.findOne({ username }, { projection: { role: 1, isActive: 1, campusName: 1 } })
  if (existing && !force) {
    console.log(`${username} already exists (role ${existing.role}, ${existing.isActive ? 'active' : 'inactive'}) — nothing changed. Re-run with --force to overwrite.`)
    await mongoose.disconnect()
    return
  }
  const now = new Date()
  const result = await users.updateOne(
    { username },
    {
      $set: { username, passwordHash, role, isActive: true, updatedAt: now },
      $setOnInsert: { createdAt: now },
      $unset: { campusName: '', campusId: '', batchId: '', batchType: '', facultyId: '' },
    },
    { upsert: true },
  )
  console.log(`${username}: ${result.upsertedCount ? 'created' : 'updated'} as ${role} on ${mongoose.connection.host}/${mongoose.connection.name}`)
  await mongoose.disconnect()
}

run().catch((e) => { console.error(e); process.exit(1) })
