/**
 * Seed IG batch chapters for Physics, Chemistry, Botany, Zoology, and Maths
 * based on NEET / JEE yearly plans.
 *
 * Data sources:
 *   Plus One NEET  : PLUS ONE YEARLY PLAN -NEET.pdf  (6 modules, Apr–Oct)
 *   Plus Two NEET  : YEARLY PLAN PLUS TWO-NEET.pdf   (5 modules, Apr–Aug)
 *   Plus One JEE   : YEARLY PLAN PLUS ONE -JEE.pdf   (6 modules, Physics+Chemistry+Maths only)
 *   Plus Two JEE   : YEARLY PLAN PLUS TWO -JEE.pdf   (5 modules, Physics+Chemistry+Maths only)
 *   Module images  : Plus One 6-Module Core Pathway, Plus Two 5-Module Accelerated Pathway
 *
 * Seeding logic:
 *   - Physics + Chemistry : ALL IG batches (identical across NEET and JEE)
 *   - Botany + Zoology    : NEET stream batches only
 *   - Maths               : stream-specific hours (NEET and JEE differ for Plus One)
 *
 * Idempotent — uses findOneAndUpdate with upsert so re-running is safe.
 *
 * Run:
 *   npm run seed:ig-neet-jee          (from server/)
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { Batch } from '../models/Batch'
import { ISBatchChapter } from '../models/ISBatchChapter'

interface ChapterDef {
  subject: string
  chapterName: string
  chapterOrder: number
  scheduledModule?: number
  durationHours?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUS ONE  (6-Module Core Pathway: Apr-May, Jun, Jul, Aug, Sep, Oct)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Plus One Physics  (identical for NEET and JEE) ───────────────────────────
const XI_PHYSICS: ChapterDef[] = [
  // Module 1 — April-May
  { subject: 'PHYSICS', chapterName: 'Units & Measurements',                          chapterOrder:  1, scheduledModule: 1, durationHours: 14 },
  { subject: 'PHYSICS', chapterName: 'Motion in a Straight Line',                     chapterOrder:  2, scheduledModule: 1, durationHours: 18 },
  // Module 2 — June
  { subject: 'PHYSICS', chapterName: 'Motion in a Plane',                             chapterOrder:  3, scheduledModule: 2, durationHours: 18 },
  { subject: 'PHYSICS', chapterName: 'Laws of Motion',                                chapterOrder:  4, scheduledModule: 2, durationHours: 20 },
  // Module 3 — July
  { subject: 'PHYSICS', chapterName: 'Work, Energy & Power',                          chapterOrder:  5, scheduledModule: 3, durationHours: 18 },
  { subject: 'PHYSICS', chapterName: 'System of Particles and Rotational Motion',     chapterOrder:  6, scheduledModule: 3, durationHours: 22 },
  // Module 4 — August
  { subject: 'PHYSICS', chapterName: 'Gravitation',                                   chapterOrder:  7, scheduledModule: 4, durationHours: 15 },
  { subject: 'PHYSICS', chapterName: 'Mechanical Properties of Solids',               chapterOrder:  8, scheduledModule: 4, durationHours: 10 },
  // Module 5 — September
  { subject: 'PHYSICS', chapterName: 'Mechanical Properties of Fluids',               chapterOrder:  9, scheduledModule: 5, durationHours: 22 },
  { subject: 'PHYSICS', chapterName: 'Thermal Properties of Matter',                  chapterOrder: 10, scheduledModule: 5, durationHours: 16 },
  { subject: 'PHYSICS', chapterName: 'Thermodynamics',                                chapterOrder: 11, scheduledModule: 5, durationHours: 12 },
  // Module 6 — October
  { subject: 'PHYSICS', chapterName: 'Kinetic Theory',                                chapterOrder: 12, scheduledModule: 6, durationHours:  6 },
  { subject: 'PHYSICS', chapterName: 'Waves',                                         chapterOrder: 13, scheduledModule: 6, durationHours: 12 },
  { subject: 'PHYSICS', chapterName: 'Oscillations',                                  chapterOrder: 14, scheduledModule: 6, durationHours: 12 },
]

// ── Plus One Chemistry  (identical for NEET and JEE) ─────────────────────────
const XI_CHEMISTRY: ChapterDef[] = [
  // Module 1
  { subject: 'CHEMISTRY', chapterName: 'Some Basic Concepts of Chemistry',                          chapterOrder:  1, scheduledModule: 1, durationHours: 12 },
  // Module 2
  { subject: 'CHEMISTRY', chapterName: 'Structure of Atom',                                         chapterOrder:  2, scheduledModule: 2, durationHours: 18 },
  { subject: 'CHEMISTRY', chapterName: 'Classification of Elements and Periodicity in Properties',  chapterOrder:  3, scheduledModule: 2, durationHours:  8 },
  // Module 3
  { subject: 'CHEMISTRY', chapterName: 'Chemical Bonding & Molecular Structure',                    chapterOrder:  4, scheduledModule: 3, durationHours: 12 },
  { subject: 'CHEMISTRY', chapterName: 'Thermodynamics',                                            chapterOrder:  5, scheduledModule: 3, durationHours: 12 },
  // Module 4
  { subject: 'CHEMISTRY', chapterName: 'Equilibrium',                                               chapterOrder:  6, scheduledModule: 4, durationHours: 18 },
  { subject: 'CHEMISTRY', chapterName: 'Redox Reactions',                                           chapterOrder:  7, scheduledModule: 4, durationHours: 10 },
  // Module 5
  { subject: 'CHEMISTRY', chapterName: 'Organic Chemistry — Some Basic Principles and Techniques',  chapterOrder:  8, scheduledModule: 5, durationHours: 24 },
  // Module 6
  { subject: 'CHEMISTRY', chapterName: 'Hydrocarbons',                                              chapterOrder:  9, scheduledModule: 6, durationHours: 12 },
]

// ── Plus One Botany  (NEET only) ──────────────────────────────────────────────
const XI_NEET_BOTANY: ChapterDef[] = [
  { subject: 'BOTANY', chapterName: 'Biological Classification',                      chapterOrder:  1, scheduledModule: 1, durationHours: 10 },
  { subject: 'BOTANY', chapterName: 'Morphology of Flowering Plants (Part I)',        chapterOrder:  2, scheduledModule: 2, durationHours: 10 },
  { subject: 'BOTANY', chapterName: 'Plant Kingdom',                                  chapterOrder:  3, scheduledModule: 2, durationHours:  7 },
  { subject: 'BOTANY', chapterName: 'Morphology of Flowering Plants (Part II)',       chapterOrder:  4, scheduledModule: 3, durationHours: 10 },
  { subject: 'BOTANY', chapterName: 'Cell the Unit of Life',                          chapterOrder:  5, scheduledModule: 3, durationHours: 10 },
  { subject: 'BOTANY', chapterName: 'Cell Cycle and Cell Division',                   chapterOrder:  6, scheduledModule: 4, durationHours:  8 },
  { subject: 'BOTANY', chapterName: 'Photosynthesis in Higher Plants',                chapterOrder:  7, scheduledModule: 4, durationHours: 12 },
  { subject: 'BOTANY', chapterName: 'Respiration in Plants',                          chapterOrder:  8, scheduledModule: 5, durationHours: 10 },
  { subject: 'BOTANY', chapterName: 'Plant Growth & Development',                     chapterOrder:  9, scheduledModule: 6, durationHours: 10 },
]

// ── Plus One Zoology  (NEET only) ─────────────────────────────────────────────
const XI_NEET_ZOOLOGY: ChapterDef[] = [
  { subject: 'ZOOLOGY', chapterName: 'The Living World',                              chapterOrder:  1, scheduledModule: 1, durationHours:  7 },
  { subject: 'ZOOLOGY', chapterName: 'Animal Kingdom',                                chapterOrder:  2, scheduledModule: 2, durationHours: 15 },
  { subject: 'ZOOLOGY', chapterName: 'Locomotion and Movement',                       chapterOrder:  3, scheduledModule: 3, durationHours:  8 },
  { subject: 'ZOOLOGY', chapterName: 'Biomolecules',                                  chapterOrder:  4, scheduledModule: 3, durationHours: 12 },
  { subject: 'ZOOLOGY', chapterName: 'Neural Control and Coordination',               chapterOrder:  5, scheduledModule: 4, durationHours:  6 },
  { subject: 'ZOOLOGY', chapterName: 'Excretory Products and Their Elimination',      chapterOrder:  6, scheduledModule: 4, durationHours:  8 },
  { subject: 'ZOOLOGY', chapterName: 'Chemical Coordination and Integration',         chapterOrder:  7, scheduledModule: 5, durationHours:  8 },
  { subject: 'ZOOLOGY', chapterName: 'Breathing and Exchange of Gases',               chapterOrder:  8, scheduledModule: 6, durationHours:  8 },
  { subject: 'ZOOLOGY', chapterName: 'Body Fluids and Their Circulation',             chapterOrder:  9, scheduledModule: 6, durationHours: 10 },
]

// ── Plus One Maths — NEET  (same chapter names as existing seed; correct hours) ─
const XI_NEET_MATHS: ChapterDef[] = [
  { subject: 'MATHS', chapterName: 'Sets',                           chapterOrder:  1, scheduledModule: 1, durationHours: 10 },
  { subject: 'MATHS', chapterName: 'Relations and Functions',        chapterOrder:  2, scheduledModule: 1, durationHours: 15 },
  { subject: 'MATHS', chapterName: 'Complex Numbers',                chapterOrder:  3, scheduledModule: 2, durationHours:  9 },
  { subject: 'MATHS', chapterName: 'Trigonometric Functions',        chapterOrder:  4, scheduledModule: 2, durationHours: 20 },
  { subject: 'MATHS', chapterName: 'Binomial Theorem',               chapterOrder:  5, scheduledModule: 3, durationHours:  6 },
  { subject: 'MATHS', chapterName: 'Linear Inequalities',            chapterOrder:  6, scheduledModule: 3, durationHours:  6 },
  { subject: 'MATHS', chapterName: 'Permutation and Combinations',   chapterOrder:  7, scheduledModule: 4, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Sequences and Series',           chapterOrder:  8, scheduledModule: 4, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Straight Lines',                 chapterOrder:  9, scheduledModule: 5, durationHours: 15 },
  { subject: 'MATHS', chapterName: 'Conic Sections',                 chapterOrder: 10, scheduledModule: 5, durationHours: 16 },
  { subject: 'MATHS', chapterName: 'Introduction to 3D Geometry',   chapterOrder: 11, scheduledModule: 5, durationHours:  6 },
  { subject: 'MATHS', chapterName: 'Limits and Derivatives',         chapterOrder: 12, scheduledModule: 6 },
  { subject: 'MATHS', chapterName: 'Statistics',                     chapterOrder: 13, scheduledModule: 6 },
  { subject: 'MATHS', chapterName: 'Probability',                    chapterOrder: 14, scheduledModule: 6 },
]

// ── Plus One Maths — JEE  (expanded hours vs NEET) ───────────────────────────
const XI_JEE_MATHS: ChapterDef[] = [
  { subject: 'MATHS', chapterName: 'Sets',                           chapterOrder:  1, scheduledModule: 1, durationHours: 15 },
  { subject: 'MATHS', chapterName: 'Relations and Functions',        chapterOrder:  2, scheduledModule: 1, durationHours: 25 },
  { subject: 'MATHS', chapterName: 'Complex Numbers',                chapterOrder:  3, scheduledModule: 2, durationHours: 15 },
  { subject: 'MATHS', chapterName: 'Trigonometric Functions',        chapterOrder:  4, scheduledModule: 2, durationHours: 30 },
  { subject: 'MATHS', chapterName: 'Binomial Theorem',               chapterOrder:  5, scheduledModule: 3, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Linear Inequalities',            chapterOrder:  6, scheduledModule: 3, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Permutation and Combinations',   chapterOrder:  7, scheduledModule: 4, durationHours: 18 },
  { subject: 'MATHS', chapterName: 'Sequences and Series',           chapterOrder:  8, scheduledModule: 4, durationHours: 18 },
  { subject: 'MATHS', chapterName: 'Straight Lines',                 chapterOrder:  9, scheduledModule: 5, durationHours: 22 },
  { subject: 'MATHS', chapterName: 'Conic Sections',                 chapterOrder: 10, scheduledModule: 5, durationHours: 22 },
  { subject: 'MATHS', chapterName: 'Introduction to 3D Geometry',   chapterOrder: 11, scheduledModule: 5, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Limits and Derivatives',         chapterOrder: 12, scheduledModule: 6 },
  { subject: 'MATHS', chapterName: 'Statistics',                     chapterOrder: 13, scheduledModule: 6 },
  { subject: 'MATHS', chapterName: 'Probability',                    chapterOrder: 14, scheduledModule: 6 },
]

// ═══════════════════════════════════════════════════════════════════════════════
// PLUS TWO  (5-Module Accelerated Pathway: Apr, May, Jun, Jul, Aug)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Plus Two Physics  (identical for NEET and JEE) ───────────────────────────
const XII_PHYSICS: ChapterDef[] = [
  // Module 1 — April
  { subject: 'PHYSICS', chapterName: 'Electric Charges and Fields',                   chapterOrder:  1, scheduledModule: 1, durationHours: 15 },
  { subject: 'PHYSICS', chapterName: 'Electrostatic Potential and Capacitance',       chapterOrder:  2, scheduledModule: 1, durationHours: 15 },
  { subject: 'PHYSICS', chapterName: 'Current Electricity',                           chapterOrder:  3, scheduledModule: 1, durationHours: 15 },
  // Module 2 — May
  { subject: 'PHYSICS', chapterName: 'Moving Charges & Magnetism',                    chapterOrder:  4, scheduledModule: 2, durationHours: 16 },
  { subject: 'PHYSICS', chapterName: 'Magnetism & Matter',                            chapterOrder:  5, scheduledModule: 2, durationHours: 10 },
  // Module 3 — June
  { subject: 'PHYSICS', chapterName: 'Electromagnetic Induction (EMI)',               chapterOrder:  6, scheduledModule: 3, durationHours:  9 },
  { subject: 'PHYSICS', chapterName: 'Alternating Current',                           chapterOrder:  7, scheduledModule: 3, durationHours: 15 },
  { subject: 'PHYSICS', chapterName: 'Electromagnetic Waves',                         chapterOrder:  8, scheduledModule: 3, durationHours:  8 },
  // Module 4 — July
  { subject: 'PHYSICS', chapterName: 'Ray Optics',                                    chapterOrder:  9, scheduledModule: 4, durationHours: 20 },
  { subject: 'PHYSICS', chapterName: 'Wave Optics',                                   chapterOrder: 10, scheduledModule: 4, durationHours: 12 },
  { subject: 'PHYSICS', chapterName: 'Dual Nature of Radiation and Matter',           chapterOrder: 11, scheduledModule: 4, durationHours:  8 },
  // Module 5 — August
  { subject: 'PHYSICS', chapterName: 'Atoms',                                         chapterOrder: 12, scheduledModule: 5, durationHours:  9 },
  { subject: 'PHYSICS', chapterName: 'Nuclei',                                        chapterOrder: 13, scheduledModule: 5, durationHours:  6 },
  { subject: 'PHYSICS', chapterName: 'Semiconductors',                                chapterOrder: 14, scheduledModule: 5, durationHours: 12 },
]

// ── Plus Two Chemistry  (identical for NEET and JEE) ─────────────────────────
const XII_CHEMISTRY: ChapterDef[] = [
  // Module 1
  { subject: 'CHEMISTRY', chapterName: 'Electrochemistry',                            chapterOrder:  1, scheduledModule: 1, durationHours: 12 },
  { subject: 'CHEMISTRY', chapterName: 'D & F Block Elements',                        chapterOrder:  2, scheduledModule: 1, durationHours: 10 },
  { subject: 'CHEMISTRY', chapterName: 'Chemical Kinetics',                           chapterOrder:  3, scheduledModule: 1, durationHours: 10 },
  { subject: 'CHEMISTRY', chapterName: 'Solutions',                                   chapterOrder:  4, scheduledModule: 1, durationHours: 12 },
  // Module 2
  { subject: 'CHEMISTRY', chapterName: 'Haloalkanes & Haloarenes',                    chapterOrder:  5, scheduledModule: 2, durationHours: 12 },
  // Module 3
  { subject: 'CHEMISTRY', chapterName: 'Coordination Compounds',                      chapterOrder:  6, scheduledModule: 3, durationHours: 10 },
  { subject: 'CHEMISTRY', chapterName: 'Alcohol, Phenol & Ether',                     chapterOrder:  7, scheduledModule: 3, durationHours: 10 },
  // Module 4
  { subject: 'CHEMISTRY', chapterName: 'Aldehyde, Ketones & Carboxylic Acid',         chapterOrder:  8, scheduledModule: 4, durationHours: 12 },
  // Module 5
  { subject: 'CHEMISTRY', chapterName: 'Amines',                                      chapterOrder:  9, scheduledModule: 5, durationHours:  6 },
  { subject: 'CHEMISTRY', chapterName: 'Biomolecules',                                chapterOrder: 10, scheduledModule: 5, durationHours:  6 },
]

// ── Plus Two Botany  (NEET only) ──────────────────────────────────────────────
const XII_NEET_BOTANY: ChapterDef[] = [
  { subject: 'BOTANY', chapterName: 'Sexual Reproduction in Flowering Plants',        chapterOrder:  1, scheduledModule: 1, durationHours: 12 },
  { subject: 'BOTANY', chapterName: 'Biotechnology 1',                                chapterOrder:  2, scheduledModule: 2, durationHours: 10 },
  { subject: 'BOTANY', chapterName: 'Biotechnology 2',                                chapterOrder:  3, scheduledModule: 3, durationHours: 10 },
  { subject: 'BOTANY', chapterName: 'Biotechnology and its Application',              chapterOrder:  4, scheduledModule: 3 },
  { subject: 'BOTANY', chapterName: 'Organism & Population',                          chapterOrder:  5, scheduledModule: 4, durationHours: 12 },
  { subject: 'BOTANY', chapterName: 'Ecosystem',                                      chapterOrder:  6, scheduledModule: 5, durationHours:  8 },
]

// ── Plus Two Zoology  (NEET only) ─────────────────────────────────────────────
const XII_NEET_ZOOLOGY: ChapterDef[] = [
  { subject: 'ZOOLOGY', chapterName: 'Human Reproduction',                            chapterOrder:  1, scheduledModule: 1, durationHours: 12 },
  { subject: 'ZOOLOGY', chapterName: 'Reproductive Health',                           chapterOrder:  2, scheduledModule: 1, durationHours:  6 },
  { subject: 'ZOOLOGY', chapterName: 'Principles of Inheritance',                     chapterOrder:  3, scheduledModule: 2, durationHours: 15 },
  { subject: 'ZOOLOGY', chapterName: 'Human Health & Diseases (Part I)',              chapterOrder:  4, scheduledModule: 3, durationHours: 12 },
  { subject: 'ZOOLOGY', chapterName: 'Human Health & Diseases (Part II)',             chapterOrder:  5, scheduledModule: 4, durationHours: 12 },
  { subject: 'ZOOLOGY', chapterName: 'Molecular Basis of Inheritance',                chapterOrder:  6, scheduledModule: 4, durationHours: 17 },
  { subject: 'ZOOLOGY', chapterName: 'Evolution',                                     chapterOrder:  7, scheduledModule: 5, durationHours: 12 },
  { subject: 'ZOOLOGY', chapterName: 'Microbes in Human Welfare',                     chapterOrder:  8, scheduledModule: 5, durationHours:  6 },
  { subject: 'ZOOLOGY', chapterName: 'Biodiversity & Conservation',                   chapterOrder:  9, scheduledModule: 5, durationHours:  6 },
]

// ── Plus Two Maths  (identical for NEET and JEE — same hours in both plans) ──
const XII_MATHS: ChapterDef[] = [
  { subject: 'MATHS', chapterName: 'Relations and Functions',          chapterOrder:  1, scheduledModule: 1, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Matrices',                         chapterOrder:  2, scheduledModule: 1, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Inverse Trigonometric Functions',  chapterOrder:  3, scheduledModule: 1, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Determinants',                     chapterOrder:  4, scheduledModule: 2, durationHours: 10 },
  { subject: 'MATHS', chapterName: 'Continuity and Differentiability', chapterOrder:  5, scheduledModule: 2, durationHours: 18 },
  { subject: 'MATHS', chapterName: 'Vector Algebra',                   chapterOrder:  6, scheduledModule: 2, durationHours: 12 },
  { subject: 'MATHS', chapterName: 'Integrals',                        chapterOrder:  7, scheduledModule: 3, durationHours: 32 },
  { subject: 'MATHS', chapterName: 'Three Dimensional Geometry',       chapterOrder:  8, scheduledModule: 3, durationHours:  6 },
  { subject: 'MATHS', chapterName: 'Differential Equations',           chapterOrder:  9, scheduledModule: 4, durationHours: 14 },
  { subject: 'MATHS', chapterName: 'Application of Derivatives',       chapterOrder: 10, scheduledModule: 4, durationHours: 18 },
  { subject: 'MATHS', chapterName: 'Linear Programming Problem',       chapterOrder: 11, scheduledModule: 4, durationHours:  6 },
  { subject: 'MATHS', chapterName: 'Application of Integrals',         chapterOrder: 12, scheduledModule: 5, durationHours: 10 },
  { subject: 'MATHS', chapterName: 'Probability',                      chapterOrder: 13, scheduledModule: 5, durationHours: 12 },
]

// ═══════════════════════════════════════════════════════════════════════════════
// Seed function
// ═══════════════════════════════════════════════════════════════════════════════

async function upsertChapters(
  batchId: mongoose.Types.ObjectId,
  chapters: ChapterDef[],
): Promise<number> {
  let count = 0
  for (const ch of chapters) {
    await ISBatchChapter.findOneAndUpdate(
      { batchId, subject: ch.subject, chapterName: ch.chapterName },
      {
        $set: {
          chapterOrder: ch.chapterOrder,
          ...(ch.scheduledModule !== undefined && { scheduledModule: ch.scheduledModule }),
          ...(ch.durationHours   !== undefined && { durationHours:   ch.durationHours   }),
        },
        $setOnInsert: { status: 'NOT_YET_SCHEDULED' },
      },
      { upsert: true },
    )
    count++
  }
  return count
}

async function seed() {
  await connectDB()
  console.log('Seeding IG NEET/JEE curriculum (Physics, Chemistry, Biology, Maths)...\n')

  const igBatches = await Batch.find({ type: 'IG' }).lean()
  const plusOneBatches = igBatches.filter((b) => b.ig1Subgroup === 'PLUS_ONE')
  const plusTwoBatches = igBatches.filter((b) => b.ig1Subgroup === 'PLUS_TWO')

  const p1Neet = plusOneBatches.filter((b) => b.stream === 'NEET')
  const p1Jee  = plusOneBatches.filter((b) => b.stream === 'JEE')
  const p1All  = plusOneBatches  // Physics + Chemistry seeded for all

  const p2Neet = plusTwoBatches.filter((b) => b.stream === 'NEET')
  const p2Jee  = plusTwoBatches.filter((b) => b.stream === 'JEE')
  const p2All  = plusTwoBatches

  console.log(`Plus One — ${plusOneBatches.length} batch(es): ${p1Neet.length} NEET, ${p1Jee.length} JEE, ${plusOneBatches.length - p1Neet.length - p1Jee.length} unstreamed`)
  console.log(`Plus Two — ${plusTwoBatches.length} batch(es): ${p2Neet.length} NEET, ${p2Jee.length} JEE, ${plusTwoBatches.length - p2Neet.length - p2Jee.length} unstreamed`)

  let total = 0

  // ── Plus One: Physics + Chemistry → ALL batches ───────────────────────────
  for (const b of p1All) {
    const n = await upsertChapters(b._id as mongoose.Types.ObjectId, [...XI_PHYSICS, ...XI_CHEMISTRY])
    console.log(`\n  [Plus One / ALL] ${b.name} — Physics (${XI_PHYSICS.length}) + Chemistry (${XI_CHEMISTRY.length})`)
    total += n
  }

  // ── Plus One: Botany + Zoology → NEET only ───────────────────────────────
  for (const b of p1Neet) {
    const n = await upsertChapters(b._id as mongoose.Types.ObjectId, [...XI_NEET_BOTANY, ...XI_NEET_ZOOLOGY])
    console.log(`  [Plus One / NEET] ${b.name} — Botany (${XI_NEET_BOTANY.length}) + Zoology (${XI_NEET_ZOOLOGY.length})`)
    total += n
  }

  // ── Plus One: Maths → stream-specific ────────────────────────────────────
  for (const b of p1Neet) {
    const n = await upsertChapters(b._id as mongoose.Types.ObjectId, XI_NEET_MATHS)
    console.log(`  [Plus One / NEET] ${b.name} — Maths (${XI_NEET_MATHS.length}, NEET hours)`)
    total += n
  }
  for (const b of p1Jee) {
    const n = await upsertChapters(b._id as mongoose.Types.ObjectId, XI_JEE_MATHS)
    console.log(`  [Plus One / JEE]  ${b.name} — Maths (${XI_JEE_MATHS.length}, JEE hours)`)
    total += n
  }

  // ── Plus Two: Physics + Chemistry → ALL batches ───────────────────────────
  for (const b of p2All) {
    const n = await upsertChapters(b._id as mongoose.Types.ObjectId, [...XII_PHYSICS, ...XII_CHEMISTRY])
    console.log(`\n  [Plus Two / ALL] ${b.name} — Physics (${XII_PHYSICS.length}) + Chemistry (${XII_CHEMISTRY.length})`)
    total += n
  }

  // ── Plus Two: Botany + Zoology → NEET only ───────────────────────────────
  for (const b of p2Neet) {
    const n = await upsertChapters(b._id as mongoose.Types.ObjectId, [...XII_NEET_BOTANY, ...XII_NEET_ZOOLOGY])
    console.log(`  [Plus Two / NEET] ${b.name} — Botany (${XII_NEET_BOTANY.length}) + Zoology (${XII_NEET_ZOOLOGY.length})`)
    total += n
  }

  // ── Plus Two: Maths → stream-agnostic (NEET and JEE are identical) ────────
  for (const b of [...p2Neet, ...p2Jee]) {
    const n = await upsertChapters(b._id as mongoose.Types.ObjectId, XII_MATHS)
    console.log(`  [Plus Two / ${b.stream ?? 'ALL'}] ${b.name} — Maths (${XII_MATHS.length})`)
    total += n
  }

  if (p1Jee.length === 0 && p1Neet.length === 0 && p2Neet.length === 0 && p2Jee.length === 0) {
    console.warn('\nNo streamed IG batches found. Set batch.stream = "NEET" or "JEE" to seed Biology and Maths correctly.')
    console.warn('Physics and Chemistry have been seeded for all IG batches regardless.')
  }

  console.log(`\nDone. ${total} chapter records upserted.`)
  await mongoose.disconnect()
}

seed().catch((err) => { console.error(err); process.exit(1) })
