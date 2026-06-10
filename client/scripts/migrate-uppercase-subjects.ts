import { config } from 'dotenv'
// Load .env.local before any other imports so env vars are available
config({ path: '.env.local' })

import mongoose from 'mongoose'

/**
 * One-time migration: normalise BatchChapter.subject to UPPERCASE.
 *
 * Session logging and the video-first gate look chapters up with
 * subject.toUpperCase(); chapters seeded before this fix were stored
 * title-case ('Physics') and therefore never matched — the gate was
 * silently bypassed and duplicate chapter rows could accumulate.
 *
 * Safe to run repeatedly. If an uppercase duplicate already exists for a
 * title-case row (because a session auto-created it), the duplicate keeps
 * whichever row has progress flags set and removes the other.
 *
 * Run:  npx tsx scripts/migrate-uppercase-subjects.ts
 */
async function migrate() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
  const col = mongoose.connection.db!.collection('batchchapters')

  const mixed = await col.find({ subject: { $regex: '[a-z]' } }).toArray()
  console.log(`Found ${mixed.length} BatchChapter docs with non-uppercase subject`)

  let renamed = 0, merged = 0
  for (const doc of mixed) {
    const upper = String(doc.subject).toUpperCase()
    const dup = await col.findOne({ batchId: doc.batchId, subject: upper, chapterName: doc.chapterName })
    if (dup) {
      // Keep the row with progress; merge flags into the uppercase row, drop the other.
      await col.updateOne(
        { _id: dup._id },
        { $set: {
          videoComplete:    Boolean(dup.videoComplete    || doc.videoComplete),
          facultyClassDone: Boolean(dup.facultyClassDone || doc.facultyClassDone),
          ...(dup.videoCompletedAt    || doc.videoCompletedAt    ? { videoCompletedAt:    dup.videoCompletedAt    ?? doc.videoCompletedAt }    : {}),
          ...(dup.facultyClassDoneAt  || doc.facultyClassDoneAt  ? { facultyClassDoneAt:  dup.facultyClassDoneAt  ?? doc.facultyClassDoneAt }  : {}),
        } },
      )
      await col.deleteOne({ _id: doc._id })
      merged++
    } else {
      await col.updateOne({ _id: doc._id }, { $set: { subject: upper } })
      renamed++
    }
  }
  console.log(`Renamed: ${renamed}, merged duplicates: ${merged}`)
  await mongoose.disconnect()
  console.log('Migration complete ✓')
}

migrate().catch((err) => { console.error(err); process.exit(1) })
