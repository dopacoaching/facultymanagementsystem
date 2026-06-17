/**
 * Seed the annual NEET syllabus schedule (June–December 2025-26).
 *
 * Run once (or re-run idempotently):
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-syllabus.ts
 *
 * Or via package.json script:
 *   npm run seed:syllabus
 *
 * totalVideos — number of individual video files for that chapter.
 *   0 = no video classes exist (e.g. Experimental Skills, Practical Chemistry);
 *       these chapters bypass the video-first gate automatically.
 * videoReshooting — videos exist but are currently being reshot; the existing
 *   videos are still usable but will be replaced.
 *
 * Range notation in the PDF (e.g. "1-30", "5-29") indicates video numbers within
 * a shared series split across chapters. totalVideos = end - start + 1.
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db'
import { SyllabusChapter } from '../models/SyllabusChapter'
import type { Subject } from '../types'

interface ChapterEntry {
  subject: Subject
  chapterName: string
  scheduledMonth: number
  chapterOrder: number
  globalOrder: number
  isSplitPart?: boolean
  splitGroup?: string
  splitPartNumber?: number
  totalVideos: number
  videoReshooting?: boolean
}

const syllabus: ChapterEntry[] = [
  // ── JUNE ──────────────────────────────────────────────────────────────────────
  { subject: 'PHYSICS',   chapterName: 'Units and Measurements',               scheduledMonth: 6,  chapterOrder: 1, globalOrder: 1,  totalVideos: 8  },
  { subject: 'PHYSICS',   chapterName: 'Atoms',                                scheduledMonth: 6,  chapterOrder: 2, globalOrder: 2,  totalVideos: 5  },
  { subject: 'PHYSICS',   chapterName: 'Nuclei',                               scheduledMonth: 6,  chapterOrder: 3, globalOrder: 3,  totalVideos: 4  },
  { subject: 'PHYSICS',   chapterName: 'Dual Nature',                          scheduledMonth: 6,  chapterOrder: 4, globalOrder: 4,  totalVideos: 8  },
  { subject: 'CHEMISTRY', chapterName: 'Structure of Atom',                    scheduledMonth: 6,  chapterOrder: 1, globalOrder: 1,  totalVideos: 23 },
  { subject: 'CHEMISTRY', chapterName: 'Classification of Elements',           scheduledMonth: 6,  chapterOrder: 2, globalOrder: 2,  totalVideos: 17 },
  { subject: 'CHEMISTRY', chapterName: 'Chemical Bonding',                     scheduledMonth: 6,  chapterOrder: 3, globalOrder: 3,  totalVideos: 22 },
  { subject: 'BIOLOGY',   chapterName: 'Biological Classification',            scheduledMonth: 6,  chapterOrder: 1, globalOrder: 1,  totalVideos: 7  },
  { subject: 'BIOLOGY',   chapterName: 'Plant Kingdom',                        scheduledMonth: 6,  chapterOrder: 2, globalOrder: 2,  totalVideos: 11 },
  { subject: 'BIOLOGY',   chapterName: 'Structural Organization in Animals',   scheduledMonth: 6,  chapterOrder: 3, globalOrder: 3,  totalVideos: 14 },
  { subject: 'BIOLOGY',   chapterName: 'Animal Kingdom',                       scheduledMonth: 6,  chapterOrder: 4, globalOrder: 4,  totalVideos: 20 },

  // ── JULY ──────────────────────────────────────────────────────────────────────
  { subject: 'PHYSICS',   chapterName: 'Waves',                                scheduledMonth: 7,  chapterOrder: 1, globalOrder: 5,  totalVideos: 21 },
  { subject: 'PHYSICS',   chapterName: 'Wave Optics',                          scheduledMonth: 7,  chapterOrder: 2, globalOrder: 6,  totalVideos: 6  },
  { subject: 'PHYSICS',   chapterName: 'Electromagnetic Waves',                scheduledMonth: 7,  chapterOrder: 3, globalOrder: 7,  totalVideos: 5  },
  { subject: 'CHEMISTRY', chapterName: 'Redox Reactions',                      scheduledMonth: 7,  chapterOrder: 1, globalOrder: 4,  totalVideos: 8  },
  { subject: 'CHEMISTRY', chapterName: 'Electrochemistry',                     scheduledMonth: 7,  chapterOrder: 2, globalOrder: 5,  totalVideos: 17 },
  { subject: 'CHEMISTRY', chapterName: 'Solutions',                            scheduledMonth: 7,  chapterOrder: 3, globalOrder: 6,  totalVideos: 12 },
  { subject: 'BIOLOGY',   chapterName: 'Morphology',                           scheduledMonth: 7,  chapterOrder: 1, globalOrder: 5,  totalVideos: 11 },
  { subject: 'BIOLOGY',   chapterName: 'Anatomy',                              scheduledMonth: 7,  chapterOrder: 2, globalOrder: 6,  totalVideos: 5,  videoReshooting: true },
  { subject: 'BIOLOGY',   chapterName: 'Biomolecules',                         scheduledMonth: 7,  chapterOrder: 3, globalOrder: 7,  totalVideos: 14 },
  { subject: 'BIOLOGY',   chapterName: 'Evolution',                            scheduledMonth: 7,  chapterOrder: 4, globalOrder: 8,  totalVideos: 5  },

  // ── AUGUST ────────────────────────────────────────────────────────────────────
  { subject: 'PHYSICS',   chapterName: '1D (with vectors)',                    scheduledMonth: 8,  chapterOrder: 1, globalOrder: 8,  totalVideos: 18 },
  { subject: 'PHYSICS',   chapterName: '2D',                                   scheduledMonth: 8,  chapterOrder: 2, globalOrder: 9,  totalVideos: 23 },
  { subject: 'PHYSICS',   chapterName: 'Laws of Motion (w/o Circular)',        scheduledMonth: 8,  chapterOrder: 3, globalOrder: 10, totalVideos: 21 },
  { subject: 'PHYSICS',   chapterName: 'Work Energy and Power',                scheduledMonth: 8,  chapterOrder: 4, globalOrder: 11, totalVideos: 27 },
  { subject: 'CHEMISTRY', chapterName: 'Some Basic Concepts of Chemistry',     scheduledMonth: 8,  chapterOrder: 1, globalOrder: 7,  totalVideos: 16 },
  { subject: 'CHEMISTRY', chapterName: 'GOC Part 1',                           scheduledMonth: 8,  chapterOrder: 2, globalOrder: 8,  totalVideos: 30, isSplitPart: true, splitGroup: 'GOC', splitPartNumber: 1 },
  { subject: 'CHEMISTRY', chapterName: 'Chemical Kinetics',                    scheduledMonth: 8,  chapterOrder: 3, globalOrder: 9,  totalVideos: 11 },
  { subject: 'CHEMISTRY', chapterName: 'd and f Block Elements',               scheduledMonth: 8,  chapterOrder: 4, globalOrder: 10, totalVideos: 12 },
  { subject: 'BIOLOGY',   chapterName: 'Cell: The Unit of Life',               scheduledMonth: 8,  chapterOrder: 1, globalOrder: 9,  totalVideos: 18 },
  { subject: 'BIOLOGY',   chapterName: 'Cell Cycle and Cell Division',         scheduledMonth: 8,  chapterOrder: 2, globalOrder: 10, totalVideos: 5  },
  { subject: 'BIOLOGY',   chapterName: 'Respiration in Plants',                scheduledMonth: 8,  chapterOrder: 3, globalOrder: 11, totalVideos: 7  },
  { subject: 'BIOLOGY',   chapterName: 'Breathing and Exchange of Gases',      scheduledMonth: 8,  chapterOrder: 4, globalOrder: 12, totalVideos: 10 },
  { subject: 'BIOLOGY',   chapterName: 'Body Fluids and Circulation',          scheduledMonth: 8,  chapterOrder: 5, globalOrder: 13, totalVideos: 11 },
  { subject: 'BIOLOGY',   chapterName: 'Excretory Products and their Elimination', scheduledMonth: 8, chapterOrder: 6, globalOrder: 14, totalVideos: 9 },

  // ── SEPTEMBER ─────────────────────────────────────────────────────────────────
  { subject: 'PHYSICS',   chapterName: 'Circular Motion',                       scheduledMonth: 9,  chapterOrder: 1, globalOrder: 12, totalVideos: 4  },
  { subject: 'PHYSICS',   chapterName: 'System of Particles and Rotational Motion', scheduledMonth: 9, chapterOrder: 2, globalOrder: 13, totalVideos: 25 },
  { subject: 'PHYSICS',   chapterName: 'Gravitation',                           scheduledMonth: 9,  chapterOrder: 3, globalOrder: 14, totalVideos: 20 },
  { subject: 'PHYSICS',   chapterName: 'Oscillations',                          scheduledMonth: 9,  chapterOrder: 4, globalOrder: 15, totalVideos: 11, videoReshooting: true },
  { subject: 'CHEMISTRY', chapterName: 'GOC Part 2',                            scheduledMonth: 9,  chapterOrder: 1, globalOrder: 11, totalVideos: 15, isSplitPart: true, splitGroup: 'GOC', splitPartNumber: 2 },
  { subject: 'CHEMISTRY', chapterName: 'Thermodynamics',                        scheduledMonth: 9,  chapterOrder: 2, globalOrder: 12, totalVideos: 13 },
  { subject: 'CHEMISTRY', chapterName: 'Chemical Equilibrium',                  scheduledMonth: 9,  chapterOrder: 3, globalOrder: 13, totalVideos: 12 },
  { subject: 'BIOLOGY',   chapterName: 'Sexual Reproduction in Flowering Plants', scheduledMonth: 9, chapterOrder: 1, globalOrder: 15, totalVideos: 13 },
  { subject: 'BIOLOGY',   chapterName: 'Plant Growth and Development',           scheduledMonth: 9,  chapterOrder: 2, globalOrder: 16, totalVideos: 8  },
  { subject: 'BIOLOGY',   chapterName: 'Biotechnology 1',                        scheduledMonth: 9,  chapterOrder: 3, globalOrder: 17, totalVideos: 7,  isSplitPart: true, splitGroup: 'Biotechnology', splitPartNumber: 1 },
  { subject: 'BIOLOGY',   chapterName: 'Locomotion and Movements',              scheduledMonth: 9,  chapterOrder: 4, globalOrder: 18, totalVideos: 9  },
  { subject: 'BIOLOGY',   chapterName: 'Neural Control and Coordination',       scheduledMonth: 9,  chapterOrder: 5, globalOrder: 19, totalVideos: 9  },
  { subject: 'BIOLOGY',   chapterName: 'Genetics 1',                            scheduledMonth: 9,  chapterOrder: 6, globalOrder: 20, totalVideos: 20, isSplitPart: true, splitGroup: 'Genetics', splitPartNumber: 1 },

  // ── OCTOBER ───────────────────────────────────────────────────────────────────
  { subject: 'PHYSICS',   chapterName: 'Mechanical Properties of Solids',       scheduledMonth: 10, chapterOrder: 1, globalOrder: 16, totalVideos: 11, videoReshooting: true },
  { subject: 'PHYSICS',   chapterName: 'Mechanical Properties of Fluids',       scheduledMonth: 10, chapterOrder: 2, globalOrder: 17, totalVideos: 19, videoReshooting: true },
  { subject: 'PHYSICS',   chapterName: 'Thermal Properties of Matter',          scheduledMonth: 10, chapterOrder: 3, globalOrder: 18, totalVideos: 14 },
  { subject: 'PHYSICS',   chapterName: 'Thermodynamics',                        scheduledMonth: 10, chapterOrder: 4, globalOrder: 19, totalVideos: 12 },
  { subject: 'PHYSICS',   chapterName: 'Kinetic Theory',                        scheduledMonth: 10, chapterOrder: 5, globalOrder: 20, totalVideos: 4  },
  { subject: 'CHEMISTRY', chapterName: 'Hydrocarbons',                          scheduledMonth: 10, chapterOrder: 1, globalOrder: 14, totalVideos: 20 },
  { subject: 'CHEMISTRY', chapterName: 'Ionic Equilibrium',                     scheduledMonth: 10, chapterOrder: 2, globalOrder: 15, totalVideos: 15 },
  { subject: 'CHEMISTRY', chapterName: 'p-Block Elements (Group 13 to 15)',     scheduledMonth: 10, chapterOrder: 3, globalOrder: 16, totalVideos: 5  },
  { subject: 'CHEMISTRY', chapterName: 'Biomolecules',                          scheduledMonth: 10, chapterOrder: 4, globalOrder: 17, totalVideos: 8  },
  { subject: 'BIOLOGY',   chapterName: 'Biotechnology 2',                       scheduledMonth: 10, chapterOrder: 1, globalOrder: 21, totalVideos: 4,  isSplitPart: true, splitGroup: 'Biotechnology', splitPartNumber: 2 },
  { subject: 'BIOLOGY',   chapterName: 'Photosynthesis in Higher Plants',       scheduledMonth: 10, chapterOrder: 2, globalOrder: 22, totalVideos: 17 },
  { subject: 'BIOLOGY',   chapterName: 'Biodiversity and Conservation',         scheduledMonth: 10, chapterOrder: 3, globalOrder: 23, totalVideos: 10 },
  { subject: 'BIOLOGY',   chapterName: 'Chemical Coordination and Integration', scheduledMonth: 10, chapterOrder: 4, globalOrder: 24, totalVideos: 7  },
  { subject: 'BIOLOGY',   chapterName: 'Genetics 2',                            scheduledMonth: 10, chapterOrder: 5, globalOrder: 25, totalVideos: 33, isSplitPart: true, splitGroup: 'Genetics', splitPartNumber: 2 },

  // ── NOVEMBER ──────────────────────────────────────────────────────────────────
  { subject: 'PHYSICS',   chapterName: 'Electric Charges and Fields',           scheduledMonth: 11, chapterOrder: 1, globalOrder: 21, totalVideos: 15 },
  { subject: 'PHYSICS',   chapterName: 'Electrostatic Potential and Capacitance', scheduledMonth: 11, chapterOrder: 2, globalOrder: 22, totalVideos: 12 },
  { subject: 'PHYSICS',   chapterName: 'Current Electricity',                   scheduledMonth: 11, chapterOrder: 3, globalOrder: 23, totalVideos: 9  },
  { subject: 'PHYSICS',   chapterName: 'Moving Charges and Magnetism',          scheduledMonth: 11, chapterOrder: 4, globalOrder: 24, totalVideos: 13 },
  { subject: 'PHYSICS',   chapterName: 'Magnetism and Matter',                  scheduledMonth: 11, chapterOrder: 5, globalOrder: 25, totalVideos: 5  },
  { subject: 'CHEMISTRY', chapterName: 'Haloalkanes and Haloarenes',            scheduledMonth: 11, chapterOrder: 1, globalOrder: 18, totalVideos: 9  },
  { subject: 'CHEMISTRY', chapterName: 'Alcohols, Phenols and Ethers',          scheduledMonth: 11, chapterOrder: 2, globalOrder: 19, totalVideos: 14 },
  { subject: 'CHEMISTRY', chapterName: 'p-Block Elements (Group 16 to 18)',     scheduledMonth: 11, chapterOrder: 3, globalOrder: 20, totalVideos: 5  },
  { subject: 'BIOLOGY',   chapterName: 'Organism and Population',               scheduledMonth: 11, chapterOrder: 1, globalOrder: 26, totalVideos: 5  },
  { subject: 'BIOLOGY',   chapterName: 'Ecosystem',                             scheduledMonth: 11, chapterOrder: 2, globalOrder: 27, totalVideos: 4  },
  { subject: 'BIOLOGY',   chapterName: 'Human Reproduction',                    scheduledMonth: 11, chapterOrder: 3, globalOrder: 28, totalVideos: 21 },
  { subject: 'BIOLOGY',   chapterName: 'Reproductive Health',                   scheduledMonth: 11, chapterOrder: 4, globalOrder: 29, totalVideos: 8  },
  { subject: 'BIOLOGY',   chapterName: 'Human Health and Diseases',             scheduledMonth: 11, chapterOrder: 5, globalOrder: 30, totalVideos: 15 },

  // ── DECEMBER ──────────────────────────────────────────────────────────────────
  { subject: 'PHYSICS',   chapterName: 'EMI',                                   scheduledMonth: 12, chapterOrder: 1, globalOrder: 26, totalVideos: 6  },
  { subject: 'PHYSICS',   chapterName: 'AC',                                    scheduledMonth: 12, chapterOrder: 2, globalOrder: 27, totalVideos: 12 },
  { subject: 'PHYSICS',   chapterName: 'Semiconductors',                        scheduledMonth: 12, chapterOrder: 3, globalOrder: 28, totalVideos: 11 },
  { subject: 'PHYSICS',   chapterName: 'Ray Optics and Optical Instruments',    scheduledMonth: 12, chapterOrder: 4, globalOrder: 29, totalVideos: 16 },
  { subject: 'PHYSICS',   chapterName: 'Experimental Skills',                   scheduledMonth: 12, chapterOrder: 5, globalOrder: 30, totalVideos: 0  },
  { subject: 'CHEMISTRY', chapterName: 'Coordination Compounds',                scheduledMonth: 12, chapterOrder: 1, globalOrder: 21, totalVideos: 10 },
  { subject: 'CHEMISTRY', chapterName: 'Aldehyde, Ketones and Carboxylic Acids', scheduledMonth: 12, chapterOrder: 2, globalOrder: 22, totalVideos: 13 },
  { subject: 'CHEMISTRY', chapterName: 'Amines',                                scheduledMonth: 12, chapterOrder: 3, globalOrder: 23, totalVideos: 7  },
  { subject: 'CHEMISTRY', chapterName: 'Practical Chemistry',                   scheduledMonth: 12, chapterOrder: 4, globalOrder: 24, totalVideos: 0  },
  { subject: 'BIOLOGY',   chapterName: 'Living World',                          scheduledMonth: 12, chapterOrder: 1, globalOrder: 31, totalVideos: 7  },
  { subject: 'BIOLOGY',   chapterName: 'Microbes in Human Welfare',             scheduledMonth: 12, chapterOrder: 2, globalOrder: 32, totalVideos: 4  },
]

async function seedSyllabus() {
  await connectDB()
  console.log('Seeding syllabus chapters...')

  for (const ch of syllabus) {
    await SyllabusChapter.findOneAndUpdate(
      { subject: ch.subject, chapterName: ch.chapterName },
      {
        $set: {
          scheduledMonth:   ch.scheduledMonth,
          chapterOrder:     ch.chapterOrder,
          globalOrder:      ch.globalOrder,
          isSplitPart:      ch.isSplitPart ?? false,
          splitGroup:       ch.splitGroup ?? null,
          splitPartNumber:  ch.splitPartNumber ?? null,
          totalVideos:      ch.totalVideos,
          videoReshooting:  ch.videoReshooting ?? false,
        },
      },
      { upsert: true }
    )
  }
  console.log(`  Upserted ${syllabus.length} chapters`)

  // Link Part 2 → Part 1 for split chapters
  const splitDefs: { group: string; subject: Subject }[] = [
    { group: 'GOC',           subject: 'CHEMISTRY' },
    { group: 'Biotechnology', subject: 'BIOLOGY' },
    { group: 'Genetics',      subject: 'BIOLOGY' },
  ]
  for (const { group, subject } of splitDefs) {
    const part1 = await SyllabusChapter.findOne({ subject, splitGroup: group, splitPartNumber: 1 })
    const part2 = await SyllabusChapter.findOne({ subject, splitGroup: group, splitPartNumber: 2 })
    if (part1 && part2) {
      await SyllabusChapter.findByIdAndUpdate(part2._id, { parentChapterId: part1._id })
      console.log(`  Linked ${subject}:${group} Part 2 → Part 1 (${part1._id})`)
    } else {
      console.warn(`  WARNING: could not find both parts for ${subject}:${group}`)
    }
  }

  // Validate counts
  const counts = await SyllabusChapter.aggregate([
    { $group: { _id: '$subject', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  console.log('\nChapter counts by subject:')
  for (const { _id, count } of counts) console.log(`  ${_id}: ${count}`)

  const total = counts.reduce((s: number, c: { _id: string; count: number }) => s + c.count, 0)
  console.log(`  TOTAL: ${total} (expected 86)`)
  if (total !== 86) throw new Error(`Syllabus seed count mismatch: expected 86, got ${total}`)

  // Summary of video data
  const noVideo = syllabus.filter((c) => c.totalVideos === 0).map((c) => `${c.subject}:${c.chapterName}`)
  const reshooting = syllabus.filter((c) => c.videoReshooting).map((c) => `${c.subject}:${c.chapterName}`)
  console.log(`\nNo-video chapters (${noVideo.length}): ${noVideo.join(', ')}`)
  console.log(`Reshooting (${reshooting.length}): ${reshooting.join(', ')}`)

  console.log('\nSyllabus seeded successfully.')
  await mongoose.disconnect()
}

seedSyllabus().catch((err) => { console.error(err); process.exit(1) })
