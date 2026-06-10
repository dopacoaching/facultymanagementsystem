import { config } from 'dotenv'
config({ path: '.env.local' })

import mongoose from 'mongoose'

/** Read-only inspection: IS timetable index shape + BatchChapter subject casing. */
async function inspect() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 })
  const db = mongoose.connection.db!

  const collections = await db.listCollections().toArray()
  const names = collections.map((c) => c.name)
  console.log('collections:', names.join(', '))

  if (names.includes('istimetableslots')) {
    const idx = await db.collection('istimetableslots').indexes()
    for (const i of idx) console.log('istimetableslots index:', JSON.stringify({ name: i.name, key: i.key, unique: i.unique ?? false }))
  }

  if (names.includes('batchchapters')) {
    const mixed = await db.collection('batchchapters').countDocuments({ subject: { $regex: '[a-z]' } })
    const total = await db.collection('batchchapters').countDocuments({})
    console.log(`batchchapters: ${total} total, ${mixed} with non-uppercase subject`)
  }

  await mongoose.disconnect()
}

inspect().catch((err) => { console.error(err); process.exit(1) })
