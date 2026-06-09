/**
 * Seed IG batch chapters for languages (English, Malayalam, Arabic) and Maths.
 *
 * Data source:
 *   - Plus One English   : xi-english.pdf  (3 terms, 6 units)
 *   - Plus One Malayalam : xi-malayalam.pdf (5 units, June–Feb)
 *   - Plus One Arabic    : Arabic Chapter Details image (5 units, 14 chapters, 51.5 h)
 *   - Plus One Maths     : 6-module pathway image (Sets → Probability)
 *   - Plus Two English   : Hsslive-xii-scheme-english.pdf (3 terms, 5 units)
 *   - Plus Two Malayalam : XII-Malayalam.pdf (4 units, June–Feb)
 *   - Plus Two Arabic    : Arabic Chapter Details image (5 units, 14 chapters, 50.5 h)
 *   - Plus Two Maths     : 5-module accelerated image (Relations → Probability)
 *
 * Run:
 *   npm run seed:ig-curriculum          (from server/)
 *
 * Idempotent — uses findOneAndUpdate with upsert so re-running is safe.
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { Batch } from '../models/Batch'
import { ISBatchChapter } from '../models/ISBatchChapter'

// ─── Curriculum data ──────────────────────────────────────────────────────────

interface ChapterDef {
  subject: string
  chapterName: string
  chapterOrder: number
  scheduledModule?: number   // 1=Apr-May, 2=Jun, 3=Jul, 4=Aug, 5=Sep, 6=Oct
  durationHours?: number
}

// ── Plus One (XI) English ─────────────────────────────────────────────────────
// Source: xi-english.pdf  Term 1: Jun–Aug, Term 2: Sep–Dec, Term 3: Jan–Feb
const XI_ENGLISH: ChapterDef[] = [
  // Term 1 — Unit 1 (June–August)
  { subject: 'ENGLISH', chapterName: 'Unit 1 — His First Flight',                    chapterOrder:  1, scheduledModule: 2 },
  { subject: 'ENGLISH', chapterName: 'Unit 1 — I Will Fly',                          chapterOrder:  2, scheduledModule: 2 },
  { subject: 'ENGLISH', chapterName: 'Unit 1 — Quests for a Theory of Everything',   chapterOrder:  3, scheduledModule: 2 },
  { subject: 'ENGLISH', chapterName: 'Unit 1 — IF (Poem)',                           chapterOrder:  4, scheduledModule: 2 },
  // Term 1 — Unit 2 (July–August)
  { subject: 'ENGLISH', chapterName: 'Unit 2 — And Then Gandhi Came',                chapterOrder:  5, scheduledModule: 3 },
  { subject: 'ENGLISH', chapterName: 'Unit 2 — Death the Leveller (Poem)',           chapterOrder:  6, scheduledModule: 3 },
  // Term 2 — Unit 2 continued (September)
  { subject: 'ENGLISH', chapterName: 'Unit 2 — The Price of Flowers',                chapterOrder:  7, scheduledModule: 5 },
  // Term 2 — Unit 3 (September–December)
  { subject: 'ENGLISH', chapterName: 'Unit 3 — Sunrise on the Hills (Poem)',         chapterOrder:  8, scheduledModule: 5 },
  { subject: 'ENGLISH', chapterName: 'Unit 3 — The Trip of Le Horla',                chapterOrder:  9, scheduledModule: 5 },
  { subject: 'ENGLISH', chapterName: 'Unit 3 — The Sacred Turtles of Kadavu',        chapterOrder: 10, scheduledModule: 5 },
  // Term 2 — Unit 4 (September–December)
  { subject: 'ENGLISH', chapterName: 'Unit 4 — Disaster Management in India',        chapterOrder: 11, scheduledModule: 6 },
  { subject: 'ENGLISH', chapterName: 'Unit 4 — The Serang of Renaganji',             chapterOrder: 12, scheduledModule: 6 },
  { subject: 'ENGLISH', chapterName: 'Unit 4 — The Wreck of the Titanic (Poem)',     chapterOrder: 13, scheduledModule: 6 },
  // Term 3 — Unit 5 (January–February)
  { subject: 'ENGLISH', chapterName: 'Unit 5 — Gooseberries',                        chapterOrder: 14 },
  { subject: 'ENGLISH', chapterName: 'Unit 5 — To Sleep (Poem)',                     chapterOrder: 15 },
  { subject: 'ENGLISH', chapterName: 'Unit 5 — Going out for a Walk',                chapterOrder: 16 },
  // Term 3 — Unit 6 (January–February)
  { subject: 'ENGLISH', chapterName: 'Unit 6 — The Cyber Space',                     chapterOrder: 17 },
  { subject: 'ENGLISH', chapterName: 'Unit 6 — Is Society Dead?',                    chapterOrder: 18 },
  { subject: 'ENGLISH', chapterName: 'Unit 6 — Conceptual Fruit',                    chapterOrder: 19 },
]

// ── Plus One (XI) Malayalam ───────────────────────────────────────────────────
// Source: xi-malayalam.pdf
const XI_MALAYALAM: ChapterDef[] = [
  { subject: 'MALAYALAM', chapterName: 'Kinav (കിനാവ്)',                             chapterOrder: 1, scheduledModule: 2 },
  { subject: 'MALAYALAM', chapterName: 'Kazcha (കാഴ്ച)',                             chapterOrder: 2, scheduledModule: 3 },
  { subject: 'MALAYALAM', chapterName: 'Ullagriv (ഉള്ളറിവ്)',                        chapterOrder: 3, scheduledModule: 5 },
  { subject: 'MALAYALAM', chapterName: 'Urav (ഉറവ്)',                                chapterOrder: 4, scheduledModule: 6 },
  { subject: 'MALAYALAM', chapterName: 'Avartthanam (ആവർത്തനം)',                     chapterOrder: 5 },
]

// ── Plus One (XI) Maths ───────────────────────────────────────────────────────
// Source: Plus One 6-Module Core Pathway image
const XI_MATHS: ChapterDef[] = [
  // Module 1 — April-May
  { subject: 'MATHS', chapterName: 'Sets',                                           chapterOrder:  1, scheduledModule: 1, durationHours: 10 },
  { subject: 'MATHS', chapterName: 'Relations and Functions',                         chapterOrder:  2, scheduledModule: 1, durationHours: 15 },
  // Module 2 — June
  { subject: 'MATHS', chapterName: 'Complex Numbers',                                 chapterOrder:  3, scheduledModule: 2, durationHours:  9 },
  { subject: 'MATHS', chapterName: 'Trigonometric Functions',                         chapterOrder:  4, scheduledModule: 2, durationHours: 20 },
  // Module 3 — July
  { subject: 'MATHS', chapterName: 'Binomial Theorem',                                chapterOrder:  5, scheduledModule: 3, durationHours:  6 },
  { subject: 'MATHS', chapterName: 'Linear Inequalities',                             chapterOrder:  6, scheduledModule: 3, durationHours:  6 },
  // Module 4 — August
  { subject: 'MATHS', chapterName: 'Permutation and Combinations',                    chapterOrder:  7, scheduledModule: 4, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Sequences and Series',                            chapterOrder:  8, scheduledModule: 4, durationHours: 12 },
  // Module 5 — September
  { subject: 'MATHS', chapterName: 'Straight Lines',                                  chapterOrder:  9, scheduledModule: 5, durationHours: 15 },
  { subject: 'MATHS', chapterName: 'Conic Sections',                                  chapterOrder: 10, scheduledModule: 5, durationHours: 16 },
  { subject: 'MATHS', chapterName: 'Introduction to 3D Geometry',                     chapterOrder: 11, scheduledModule: 5, durationHours:  6 },
  // Module 6 — October
  { subject: 'MATHS', chapterName: 'Limits and Derivatives',                          chapterOrder: 12, scheduledModule: 6 },
  { subject: 'MATHS', chapterName: 'Statistics',                                      chapterOrder: 13, scheduledModule: 6 },
  { subject: 'MATHS', chapterName: 'Probability',                                     chapterOrder: 14, scheduledModule: 6 },
]

// ── Plus Two (XII) English ────────────────────────────────────────────────────
// Source: Hsslive-xii-scheme-english.pdf  Term I: Jun–Aug, Term II: Sep–Dec, Term III: Jan
const XII_ENGLISH: ChapterDef[] = [
  // Term I — Unit 1 (June)
  { subject: 'ENGLISH', chapterName: 'Unit 1 — The 3Ls of Empowerment (Speech)',     chapterOrder:  1, scheduledModule: 3 },
  { subject: 'ENGLISH', chapterName: 'Unit 1 — Any Woman (Poem)',                    chapterOrder:  2, scheduledModule: 3 },
  { subject: 'ENGLISH', chapterName: 'Unit 1 — Horegallu (Anecdote)',                chapterOrder:  3, scheduledModule: 3 },
  { subject: 'ENGLISH', chapterName: 'Unit 1 — Matchbox (Story)',                    chapterOrder:  4, scheduledModule: 3 },
  // Term I — Unit 2 (July–August)
  { subject: 'ENGLISH', chapterName: 'Unit 2 — Language Elements (Term I)',          chapterOrder:  5, scheduledModule: 4 },
  { subject: 'ENGLISH', chapterName: 'Unit 2 — Mending Wall (Poem)',                 chapterOrder:  6, scheduledModule: 4 },
  { subject: 'ENGLISH', chapterName: 'Unit 2 — Amigo Brothers (Story)',              chapterOrder:  7, scheduledModule: 4 },
  { subject: 'ENGLISH', chapterName: 'Unit 2 — The Hour of Truth (One-act play)',    chapterOrder:  8, scheduledModule: 4 },
  // Term II — Unit 3 (September–October)
  { subject: 'ENGLISH', chapterName: 'Unit 3 — A Three Wheeled Revolution (Interview)', chapterOrder: 9, scheduledModule: 5 },
  { subject: 'ENGLISH', chapterName: 'Unit 3 — Didi (Life Writing)',                 chapterOrder: 10, scheduledModule: 5 },
  { subject: 'ENGLISH', chapterName: 'Unit 3 — Stammer (Poem)',                      chapterOrder: 11, scheduledModule: 5 },
  // Term II — Unit 4 (October–November)
  { subject: 'ENGLISH', chapterName: 'Unit 4 — Language Elements (Term II)',         chapterOrder: 12 },
  { subject: 'ENGLISH', chapterName: 'Unit 4 — When a Sapling is Planted (Speech)',  chapterOrder: 13 },
  { subject: 'ENGLISH', chapterName: 'Unit 4 — Rice (Poem)',                         chapterOrder: 14 },
  { subject: 'ENGLISH', chapterName: 'Unit 4 — Dangers of Drug Abuse (Essay)',       chapterOrder: 15 },
  // Term II — Unit 5 (December)
  { subject: 'ENGLISH', chapterName: 'Unit 5 — Language Elements (Term III)',        chapterOrder: 16 },
  { subject: 'ENGLISH', chapterName: 'Unit 5 — Post Early for Christmas (One-act play)', chapterOrder: 17 },
  { subject: 'ENGLISH', chapterName: 'Unit 5 — This is Going to Hurt Just a Little Bit (Poem)', chapterOrder: 18 },
  // Term III — Unit 5 continued (January)
  { subject: 'ENGLISH', chapterName: 'Unit 5 — Crime and Punishment (Story)',        chapterOrder: 19 },
  { subject: 'ENGLISH', chapterName: 'Unit 5 — Revision',                            chapterOrder: 20 },
]

// ── Plus Two (XII) Malayalam ──────────────────────────────────────────────────
// Source: XII-Malayalam.pdf
const XII_MALAYALAM: ChapterDef[] = [
  { subject: 'MALAYALAM', chapterName: 'Ezhuthukam (എഴുത്തകം)',  chapterOrder: 1, scheduledModule: 3, durationHours: 30 },
  { subject: 'MALAYALAM', chapterName: 'Thanatidam (തനതിടം)',    chapterOrder: 2, scheduledModule: 4, durationHours: 30 },
  { subject: 'MALAYALAM', chapterName: 'Darppanam (ദർപ്പണം)',    chapterOrder: 3, durationHours: 28 },
  { subject: 'MALAYALAM', chapterName: 'Madhyamam (മാധ്യമം)',    chapterOrder: 4, durationHours: 28 },
]

// ── Plus One (XI) Arabic ─────────────────────────────────────────────────────
// Source: Arabic Chapter Details image (Plus One)
// 5 units, 14 chapters, total 51.5 hours
// Module mapping: Unit 1→mod2(Jun), Unit 2→mod3(Jul), Unit 3→mod4(Aug), Unit 4→mod5(Sep), Unit 5→mod6(Oct)
const XI_ARABIC: ChapterDef[] = [
  // Unit 1
  { subject: 'ARABIC', chapterName: 'Unit 1 — In the School Campus',       chapterOrder:  1, scheduledModule: 2, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 1 — The Weakest of Houses',       chapterOrder:  2, scheduledModule: 2, durationHours: 3.5 },
  { subject: 'ARABIC', chapterName: 'Unit 1 — Congratulations',             chapterOrder:  3, scheduledModule: 2, durationHours: 3.5 },
  // Unit 2
  { subject: 'ARABIC', chapterName: 'Unit 2 — A Glimpse into Nature',       chapterOrder:  4, scheduledModule: 3, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 2 — Precious Gems',               chapterOrder:  5, scheduledModule: 3, durationHours: 3.5 },
  { subject: 'ARABIC', chapterName: 'Unit 2 — How Much You Complain',       chapterOrder:  6, scheduledModule: 3, durationHours: 4   },
  // Unit 3
  { subject: 'ARABIC', chapterName: 'Unit 3 — In the Clinic',               chapterOrder:  7, scheduledModule: 4, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 3 — Health and Lifestyle',         chapterOrder:  8, scheduledModule: 4, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 3 — Ibnuseena',                   chapterOrder:  9, scheduledModule: 4, durationHours: 3.5 },
  // Unit 4
  { subject: 'ARABIC', chapterName: 'Unit 4 — E-Mail',                      chapterOrder: 10, scheduledModule: 5, durationHours: 3.5 },
  { subject: 'ARABIC', chapterName: 'Unit 4 — Missed Call',                 chapterOrder: 11, scheduledModule: 5, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 4 — Media and Safety of Society', chapterOrder: 12, scheduledModule: 5, durationHours: 4   },
  // Unit 5
  { subject: 'ARABIC', chapterName: 'Unit 5 — The Sweetness of Motherhood', chapterOrder: 13, scheduledModule: 6, durationHours: 3   },
  { subject: 'ARABIC', chapterName: 'Unit 5 — A Sacrifice for the Homeland',chapterOrder: 14, scheduledModule: 6, durationHours: 3   },
]

// ── Plus Two (XII) Arabic ─────────────────────────────────────────────────────
// Source: Arabic Chapter Details image (Plus Two)
// 5 units, 14 chapters, total 50.5 hours
// Module mapping (5-module accelerated): Unit 1→mod1(Apr), Unit 2→mod2(May), Unit 3→mod3(Jun), Unit 4→mod4(Jul), Unit 5→mod5(Aug)
const XII_ARABIC: ChapterDef[] = [
  // Unit 1 — Language of God in God's Own Country
  { subject: 'ARABIC', chapterName: "Unit 1 — God's Goodness",                       chapterOrder:  1, scheduledModule: 1, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 1 — A Genius from Kerala',                  chapterOrder:  2, scheduledModule: 1, durationHours: 3.5 },
  { subject: 'ARABIC', chapterName: "Unit 1 — Kerala and God's Countless Blessings",  chapterOrder:  3, scheduledModule: 1, durationHours: 4   },
  // Unit 2 — Towards Happiness
  { subject: 'ARABIC', chapterName: "Unit 2 — Sleep and Don't Wake Up",               chapterOrder:  4, scheduledModule: 2, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 2 — Traffic Police',                        chapterOrder:  5, scheduledModule: 2, durationHours: 3.5 },
  { subject: 'ARABIC', chapterName: 'Unit 2 — The Chemistry of Happiness',            chapterOrder:  6, scheduledModule: 2, durationHours: 3   },
  // Unit 3 — The Sweetness of Arabic
  { subject: 'ARABIC', chapterName: 'Unit 3 — The Language of "Lad"',                 chapterOrder:  7, scheduledModule: 3, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 3 — Do Not Blame Me',                       chapterOrder:  8, scheduledModule: 3, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 3 — Linguistic Pearls',                     chapterOrder:  9, scheduledModule: 3, durationHours: 3   },
  // Unit 4 — To the Shore of Dreams
  { subject: 'ARABIC', chapterName: 'Unit 4 — Are You Alone..?',                      chapterOrder: 10, scheduledModule: 4, durationHours: 3.5 },
  { subject: 'ARABIC', chapterName: 'Unit 4 — Do Not Kill Yourselves',                chapterOrder: 11, scheduledModule: 4, durationHours: 4   },
  { subject: 'ARABIC', chapterName: 'Unit 4 — A Testament from the Loving One',       chapterOrder: 12, scheduledModule: 4, durationHours: 4   },
  // Unit 5 — A Window to Opportunities
  { subject: 'ARABIC', chapterName: 'Unit 5 — Where to Escape..?',                    chapterOrder: 13, scheduledModule: 5, durationHours: 3   },
  { subject: 'ARABIC', chapterName: "Unit 5 — Today's News",                          chapterOrder: 14, scheduledModule: 5, durationHours: 3   },
]

// ── Plus Two (XII) Maths ──────────────────────────────────────────────────────
// Source: Plus Two 5-Module Accelerated Pathway image
const XII_MATHS: ChapterDef[] = [
  // Module 1 — April
  { subject: 'MATHS', chapterName: 'Relations and Functions',                         chapterOrder:  1, scheduledModule: 1, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Matrices',                                        chapterOrder:  2, scheduledModule: 1, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Inverse Trigonometric Functions',                 chapterOrder:  3, scheduledModule: 1, durationHours: 12 },
  // Module 2 — May
  { subject: 'MATHS', chapterName: 'Determinants',                                    chapterOrder:  4, scheduledModule: 2, durationHours: 10 },
  { subject: 'MATHS', chapterName: 'Continuity and Differentiability',                chapterOrder:  5, scheduledModule: 2, durationHours: 18 },
  { subject: 'MATHS', chapterName: 'Vector Algebra',                                  chapterOrder:  6, scheduledModule: 2, durationHours: 12 },
  // Module 3 — June
  { subject: 'MATHS', chapterName: 'Integrals',                                       chapterOrder:  7, scheduledModule: 3, durationHours: 32 },
  { subject: 'MATHS', chapterName: 'Three Dimensional Geometry',                      chapterOrder:  8, scheduledModule: 3, durationHours:  6 },
  // Module 4 — July
  { subject: 'MATHS', chapterName: 'Differential Equations',                          chapterOrder:  9, scheduledModule: 4, durationHours: 14 },
  { subject: 'MATHS', chapterName: 'Application of Derivatives',                      chapterOrder: 10, scheduledModule: 4, durationHours: 18 },
  { subject: 'MATHS', chapterName: 'Linear Programming Problem',                      chapterOrder: 11, scheduledModule: 4, durationHours:  6 },
  // Module 5 — August
  { subject: 'MATHS', chapterName: 'Application of Integrals',                        chapterOrder: 12, scheduledModule: 5, durationHours: 10 },
  { subject: 'MATHS', chapterName: 'Probability',                                     chapterOrder: 13, scheduledModule: 5, durationHours: 12 },
]

// ─── Seed function ────────────────────────────────────────────────────────────

async function seed() {
  await connectDB()
  console.log('Seeding IG curriculum (English, Malayalam, Arabic, Maths)...\n')

  const igBatches = await Batch.find({ type: 'IG' }).lean()
  const plusOneBatches = igBatches.filter((b) => b.ig1Subgroup === 'PLUS_ONE')
  const plusTwoBatches = igBatches.filter((b) => b.ig1Subgroup === 'PLUS_TWO')

  console.log(`Found ${plusOneBatches.length} Plus One batch(es): ${plusOneBatches.map((b) => b.name).join(', ')}`)
  console.log(`Found ${plusTwoBatches.length} Plus Two batch(es): ${plusTwoBatches.map((b) => b.name).join(', ')}`)

  if (!plusOneBatches.length && !plusTwoBatches.length) {
    console.warn('\nNo IG batches found. Run the main seed first (npm run seed).')
    await mongoose.disconnect()
    return
  }

  let upserted = 0

  async function upsertChapters(batchId: mongoose.Types.ObjectId, chapters: ChapterDef[]) {
    for (const ch of chapters) {
      await ISBatchChapter.findOneAndUpdate(
        { batchId, subject: ch.subject, chapterName: ch.chapterName },
        {
          $set: {
            chapterOrder:    ch.chapterOrder,
            ...(ch.scheduledModule !== undefined && { scheduledModule: ch.scheduledModule }),
            ...(ch.durationHours   !== undefined && { durationHours:   ch.durationHours }),
          },
          $setOnInsert: { status: 'NOT_YET_SCHEDULED' },
        },
        { upsert: true }
      )
      upserted++
    }
  }

  for (const batch of plusOneBatches) {
    console.log(`\n  Plus One: ${batch.name}`)
    await upsertChapters(batch._id as mongoose.Types.ObjectId, XI_ENGLISH)
    console.log(`    English   — ${XI_ENGLISH.length} chapters`)
    await upsertChapters(batch._id as mongoose.Types.ObjectId, XI_MALAYALAM)
    console.log(`    Malayalam — ${XI_MALAYALAM.length} chapters`)
    await upsertChapters(batch._id as mongoose.Types.ObjectId, XI_ARABIC)
    console.log(`    Arabic    — ${XI_ARABIC.length} chapters`)
    await upsertChapters(batch._id as mongoose.Types.ObjectId, XI_MATHS)
    console.log(`    Maths     — ${XI_MATHS.length} chapters`)
  }

  for (const batch of plusTwoBatches) {
    console.log(`\n  Plus Two: ${batch.name}`)
    await upsertChapters(batch._id as mongoose.Types.ObjectId, XII_ENGLISH)
    console.log(`    English   — ${XII_ENGLISH.length} chapters`)
    await upsertChapters(batch._id as mongoose.Types.ObjectId, XII_MALAYALAM)
    console.log(`    Malayalam — ${XII_MALAYALAM.length} chapters`)
    await upsertChapters(batch._id as mongoose.Types.ObjectId, XII_ARABIC)
    console.log(`    Arabic    — ${XII_ARABIC.length} chapters`)
    await upsertChapters(batch._id as mongoose.Types.ObjectId, XII_MATHS)
    console.log(`    Maths     — ${XII_MATHS.length} chapters`)
  }

  console.log(`\nDone. ${upserted} chapter records upserted.`)
  await mongoose.disconnect()
}

seed().catch((err) => { console.error(err); process.exit(1) })
