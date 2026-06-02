import { config } from 'dotenv'
// Load .env.local before any other imports so env vars are available
config({ path: '.env.local' })

import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../../server/src/models/User'
import { Faculty } from '../../server/src/models/Faculty'
import { Campus } from '../../server/src/models/Campus'
import { Batch } from '../../server/src/models/Batch'
import { BatchChapter } from '../../server/src/models/BatchChapter'
import { PermanentFacultyContract } from '../../server/src/models/PermanentFacultyContract'
import { ISTimetableSlot } from '../../server/src/models/ISTimetableSlot'
import { ISBatchChapter } from '../../server/src/models/ISBatchChapter'
import { SpecialDay } from '../../server/src/models/SpecialDay'
import { validatePasswordComplexity } from '../../server/src/utils/passwordUtils'

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is required in .env.local')

/** Read an integer from env, fall back to a default. */
const e = (key: string, def: number): number => {
  const v = process.env[key]
  return v !== undefined && v !== '' ? Number(v) : def
}
/** Read a string from env, fall back to a default. */
const es = (key: string, def: string): string => process.env[key] || def

async function seed() {
  await mongoose.connect(uri!, { serverSelectionTimeoutMS: 10_000 })
  console.log('MongoDB connected ✓')
  console.log('Clearing existing data...')
  await Promise.all([
    User.deleteMany({}),
    Faculty.deleteMany({}),
    Campus.deleteMany({}),
    Batch.deleteMany({}),
    BatchChapter.deleteMany({}),
    PermanentFacultyContract.deleteMany({}),
    ISBatchChapter.deleteMany({}),
    SpecialDay.deleteMany({}),
  ])
  // Drop old ISTimetableSlot collection to reset indexes
  await ISTimetableSlot.collection.drop().catch(() => { /* collection may not exist yet */ })

  // ── Campuses ──────────────────────────────────────────────────────────────
  const [
    campusFeroke, campusKottakkal, campusCalicut, campusPVT,
    campusNarikuni, campusThrissur, campusOnline,
    campusCalicutOffline, campusKottakkalOffline, campusTamilNadu, campusThrissurOffline,
    melmuri, ayikk,
  ] = await Campus.insertMany([
    { name: 'Feroke Campus',            location: 'Feroke' },
    { name: 'Kottakkal Campus',         location: 'Kottakkal' },
    { name: 'Calicut Campus',           location: 'Calicut' },
    { name: 'PVT Campus',               location: 'PVT' },
    { name: 'Narikuni Campus',          location: 'Narikuni' },
    { name: 'Thrissur Campus',          location: 'Thrissur' },
    { name: 'Online',                   location: 'Virtual' },
    { name: 'Calicut Offline Center',   location: 'Calicut' },
    { name: 'Kottakkal Offline Center', location: 'Kottakkal' },
    { name: 'Tamil Nadu Campus',        location: 'Tamil Nadu' },
    { name: 'Thrissur Offline Center',  location: 'Thrissur' },
    { name: 'IG1 — Melmuri-27',         location: 'Melmuri' },
    { name: 'IG2 — Ayikkarapadi',        location: 'Ayikkarapadi' },
  ])

  // ── Batches ───────────────────────────────────────────────────────────────
  const [
    batchFerGirls, batchKotGirls, batchKotBoys, batchCalBoys,
    batchPVTGirls, batchNarGirls, batchThrGirls, batchOnline,
    batchCalOff1, batchCalOff2, batchKotOff1, batchKotOff2, batchTamil, batchThrOff,
    resCalicut, r1, r2, r3, s1, s2, s3, r4, s4, s5,
  ] = await Batch.insertMany([
    { name: 'Feroke Girls',    type: 'RESIDENTIAL', campusId: campusFeroke._id },
    { name: 'Kottakkal Girls', type: 'RESIDENTIAL', campusId: campusKottakkal._id },
    { name: 'Kottakkal Boys',  type: 'RESIDENTIAL', campusId: campusKottakkal._id },
    { name: 'Calicut Boys',    type: 'RESIDENTIAL', campusId: campusCalicut._id },
    { name: 'PVT Girls',       type: 'RESIDENTIAL', campusId: campusPVT._id },
    { name: 'Narikuni Girls',  type: 'RESIDENTIAL', campusId: campusNarikuni._id },
    { name: 'Thrissur Girls',  type: 'RESIDENTIAL', campusId: campusThrissur._id },
    { name: 'Online Batch',    type: 'ONLINE',       campusId: campusOnline._id },
    { name: 'Calicut Offline Batch 1',    type: 'OFFLINE', campusId: campusCalicutOffline._id },
    { name: 'Calicut Offline Batch 2',    type: 'OFFLINE', campusId: campusCalicutOffline._id },
    { name: 'Kottakkal Offline Batch 1',  type: 'OFFLINE', campusId: campusKottakkalOffline._id },
    { name: 'Kottakkal Offline Batch 2',  type: 'OFFLINE', campusId: campusKottakkalOffline._id },
    { name: 'Tamil Batch',                type: 'OFFLINE', campusId: campusTamilNadu._id },
    { name: 'Thrissur Offline',           type: 'OFFLINE', campusId: campusThrissurOffline._id },
    { name: 'R1', type: 'INTEGRATED_SCHOOL', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE' },
    { name: 'R2', type: 'INTEGRATED_SCHOOL', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE' },
    { name: 'R3', type: 'INTEGRATED_SCHOOL', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO' },
    { name: 'S1', type: 'INTEGRATED_SCHOOL', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE' },
    { name: 'S2', type: 'INTEGRATED_SCHOOL', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO' },
    { name: 'S3', type: 'INTEGRATED_SCHOOL', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO' },
    { name: 'R4', type: 'INTEGRATED_SCHOOL', campusId: ayikk._id },
    { name: 'S4', type: 'INTEGRATED_SCHOOL', campusId: ayikk._id },
    { name: 'S5', type: 'INTEGRATED_SCHOOL', campusId: ayikk._id },
  ])
  void batchKotGirls; void batchKotBoys; void batchCalBoys
  void batchPVTGirls; void batchNarGirls; void batchThrGirls; void batchOnline
  void batchCalOff1;  void batchCalOff2;  void batchKotOff1;  void batchKotOff2
  void batchTamil;    void batchThrOff;   void resCalicut
  void r2; void r3; void s1; void s2; void s3; void s4; void s5

  // ── Faculty ───────────────────────────────────────────────────────────────
  const facultyDocs = await Faculty.insertMany([
    { name: 'Ashraf AC',               subject: 'Chemistry',    type: 'PERMANENT', salaryModel: 'FIXED_WITH_QUOTA',      fixedMonthlySalary: e('SALARY_ASHRAF_FIXED', 400000),   monthlyHourQuota: e('SALARY_ASHRAF_QUOTA_HRS', 120) },
    { name: 'Abdul Adil VK',           subject: 'Biology',      type: 'PERMANENT', salaryModel: 'HOURLY',                hourlyRate: e('SALARY_ADIL_RATE', 1100) },
    { name: 'Dr. Sanoop Sebastian',    subject: 'Mathematics',  type: 'PERMANENT', salaryModel: 'HOURLY',                hourlyRate: e('SALARY_SANOOP_RATE', 750) },
    { name: 'Fahad T',                 subject: 'English',      type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY',         fixedMonthlySalary: e('SALARY_FAHAD_FIXED', 17000),     monthlyDayQuota: e('SALARY_FAHAD_MIN_DAYS', 8) },
    { name: 'Muhammed Ashique EK',     subject: 'Mathematics',  type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY',         fixedMonthlySalary: e('SALARY_ASHIQUE_FIXED', 75000),   monthlyLeaveAllowance: e('SALARY_ASHIQUE_MONTHLY_LEAVE', 8), aprilLeaveAllowance: e('SALARY_ASHIQUE_APRIL_LEAVE', 4) },
    { name: 'Hisham Abdul Kadir NP',   subject: 'Physics',      type: 'PERMANENT', salaryModel: 'HOURLY',                hourlyRate: e('SALARY_HISHAM_RATE', 900) },
    { name: 'Muneeb Haneefa C',        subject: 'Physics',      type: 'PERMANENT', salaryModel: 'HOURLY',                hourlyRate: e('SALARY_MUNEEB_RATE', 1150),              minDaysNormal: e('SALARY_MUNEEB_MIN_DAYS', 22), minDaysDryMonth: e('SALARY_MUNEEB_MIN_DAYS_DRY', 10) },
    { name: 'Fahim BM',                subject: 'Chemistry',    type: 'PERMANENT', salaryModel: 'FIXED_WITH_QUOTA',      fixedMonthlySalary: e('SALARY_FAHIM_FIXED', 40000),     monthlyHourQuota: e('SALARY_FAHIM_OT_THRESHOLD', 50), overtimeThreshold: e('SALARY_FAHIM_OT_THRESHOLD', 50), overtimeRate: e('SALARY_FAHIM_OT_RATE', 850) },
    { name: 'Muhsin AV',               subject: 'Biology',      type: 'PERMANENT', salaryModel: 'HOURLY',                hourlyRate: e('SALARY_MUHSIN_RATE', 1000) },
    { name: 'Anand K',                 subject: 'Biology',      type: 'PERMANENT', salaryModel: 'FIXED_WITH_QUOTA',      fixedMonthlySalary: e('SALARY_ANAND_FIXED', 120000),    monthlyHourQuota: e('SALARY_ANAND_QUOTA_HRS', 135) },
    { name: 'Habid PP',                subject: 'Chemistry',    type: 'PERMANENT', salaryModel: 'HOURLY',                hourlyRate: e('SALARY_HABID_RATE', 1100) },
    { name: 'Dr. Dunoonul Shibli',     subject: 'Biology',      type: 'PERMANENT', salaryModel: 'SPLIT_FIXED_VARIABLE',  fixedComponent: e('SALARY_SHIBLI_FIXED_COMP', 50000),  variableComponent: e('SALARY_SHIBLI_VAR_COMP', 150000), monthlyDayQuota: e('SALARY_SHIBLI_MIN_DAYS', 16), monthlyHourQuota: e('SALARY_SHIBLI_MIN_HOURS', 96) },
    { name: 'Anoop K',                 subject: 'Physics',      type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY',         fixedMonthlySalary: e('SALARY_ANOOP_FIXED', 200000),    monthlyDayQuota: e('SALARY_ANOOP_MIN_DAYS', 16) },
    { name: 'Dileep',                  subject: 'TBD',          type: 'PERMANENT', salaryModel: 'CONFIGURABLE' },
  ])

  const byName = Object.fromEntries(facultyDocs.map((f: { name: string; _id: mongoose.Types.ObjectId }) => [f.name, f._id]))

  // ── PermanentFacultyContracts ──────────────────────────────────────────────
  await PermanentFacultyContract.insertMany([
    { facultyId: byName['Ashraf AC'],           contractType: 'FIXED_QUOTA_CARRYFORWARD', fixedMonthlySalary: e('SALARY_ASHRAF_FIXED', 400000),   monthlyHourQuota: e('SALARY_ASHRAF_QUOTA_HRS', 120),  hasCarryForward: true },
    { facultyId: byName['Abdul Adil VK'],       contractType: 'HOURLY',                   hourlyRate: e('SALARY_ADIL_RATE', 1100) },
    { facultyId: byName['Dr. Sanoop Sebastian'],contractType: 'HOURLY',                   hourlyRate: e('SALARY_SANOOP_RATE', 750) },
    { facultyId: byName['Fahad T'],             contractType: 'FIXED_MONTHLY_MIN_DAYS',   fixedMonthlySalary: e('SALARY_FAHAD_FIXED', 17000),     minDaysNormal: e('SALARY_FAHAD_MIN_DAYS', 8) },
    { facultyId: byName['Muhammed Ashique EK'], contractType: 'FIXED_MONTHLY_LEAVE',      fixedMonthlySalary: e('SALARY_ASHIQUE_FIXED', 75000),   monthlyLeaveAllowance: e('SALARY_ASHIQUE_MONTHLY_LEAVE', 8), aprilLeaveAllowance: e('SALARY_ASHIQUE_APRIL_LEAVE', 4) },
    { facultyId: byName['Hisham Abdul Kadir NP'],contractType: 'HOURLY',                  hourlyRate: e('SALARY_HISHAM_RATE', 900) },
    { facultyId: byName['Muneeb Haneefa C'],    contractType: 'HOURLY_MIN_DAYS',          hourlyRate: e('SALARY_MUNEEB_RATE', 1150),              minDaysNormal: e('SALARY_MUNEEB_MIN_DAYS', 22), minDaysDryMonths: e('SALARY_MUNEEB_MIN_DAYS_DRY', 10), dryMonths: [2, 3, 5] },
    { facultyId: byName['Fahim BM'],            contractType: 'BASE_OVERTIME',            fixedMonthlySalary: e('SALARY_FAHIM_FIXED', 40000),     monthlyHourQuota: e('SALARY_FAHIM_OT_THRESHOLD', 50), overtimeThresholdHours: e('SALARY_FAHIM_OT_THRESHOLD', 50), overtimeRatePerHour: e('SALARY_FAHIM_OT_RATE', 850) },
    { facultyId: byName['Muhsin AV'],           contractType: 'HOURLY',                   hourlyRate: e('SALARY_MUHSIN_RATE', 1000) },
    { facultyId: byName['Anand K'],             contractType: 'FIXED_QUOTA_NOCARRY',      fixedMonthlySalary: e('SALARY_ANAND_FIXED', 120000),    monthlyHourQuota: e('SALARY_ANAND_QUOTA_HRS', 135), hasCarryForward: false },
    { facultyId: byName['Habid PP'],            contractType: 'HOURLY',                   hourlyRate: e('SALARY_HABID_RATE', 1100) },
    { facultyId: byName['Dr. Dunoonul Shibli'], contractType: 'SPLIT_FIXED_VARIABLE',     fixedComponent: e('SALARY_SHIBLI_FIXED_COMP', 50000),  variableComponent: e('SALARY_SHIBLI_VAR_COMP', 150000), cancellationPenaltyPerClass: e('SALARY_SHIBLI_CANCEL_PENALTY', 9000), minDaysNormal: e('SALARY_SHIBLI_MIN_DAYS', 16), minHoursRequirement: e('SALARY_SHIBLI_MIN_HOURS', 96) },
    { facultyId: byName['Anoop K'],             contractType: 'FIXED_MONTHLY_MIN_DAYS',   fixedMonthlySalary: e('SALARY_ANOOP_FIXED', 200000),    minDaysNormal: e('SALARY_ANOOP_MIN_DAYS', 16) },
    { facultyId: byName['Dileep'],              contractType: 'CONFIGURABLE',             isConfigured: false },
  ])

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = (p: string) => bcrypt.hash(p, 12)

  const adminPwdRaw  = es('SEED_ADMIN_PASSWORD', 'Dopa@Admin1!')
  const adminPwdError = validatePasswordComplexity(adminPwdRaw)
  if (adminPwdError) throw new Error(`SEED_ADMIN_PASSWORD fails complexity check: ${adminPwdError}`)

  const adminPwd      = await hash(adminPwdRaw)
  const adminUsername = es('SEED_ADMIN_USERNAME', 'it@dopacoaching.com')

  await User.create({
    username:     adminUsername.trim().toLowerCase(),
    passwordHash: adminPwd,
    role:         'ADMIN',
  })

  // ── BatchChapters for Feroke Girls (RESIDENTIAL) ─────────────────────────
  const NEET_CHAPTERS = [
    { subject: 'Physics',   chapters: ['Physical World & Measurement', 'Kinematics', 'Laws of Motion', 'Work, Energy & Power', 'Motion of System of Particles', 'Gravitation', 'Properties of Bulk Matter', 'Thermodynamics', 'Behaviour of Perfect Gases', 'Oscillations', 'Waves'] },
    { subject: 'Chemistry', chapters: ['Some Basic Concepts of Chemistry', 'Structure of Atom', 'Classification of Elements & Periodicity', 'Chemical Bonding & Molecular Structure', 'States of Matter', 'Thermodynamics', 'Equilibrium', 'Redox Reactions', 'Hydrogen', 'The s-Block Elements', 'Some p-Block Elements', 'Organic Chemistry — Basic Principles', 'Hydrocarbons', 'Environmental Chemistry'] },
    { subject: 'Biology',   chapters: ['The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom', 'Morphology of Flowering Plants', 'Anatomy of Flowering Plants', 'Structural Organisation in Animals', 'Cell: The Unit of Life', 'Biomolecules', 'Cell Cycle & Cell Division', 'Transport in Plants', 'Mineral Nutrition', 'Photosynthesis in Higher Plants', 'Respiration in Plants', 'Plant Growth & Development', 'Digestion & Absorption', 'Breathing & Exchange of Gases', 'Body Fluids & Circulation', 'Excretory Products & their Elimination', 'Locomotion & Movement', 'Neural Control & Coordination', 'Chemical Coordination & Integration'] },
  ]

  const chapterDocs: {
    batchId: mongoose.Types.ObjectId
    subject: string
    chapterName: string
    chapterOrder: number
    videoComplete: boolean
    facultyClassDone: boolean
  }[] = []

  for (const { subject, chapters } of NEET_CHAPTERS) {
    chapters.forEach((chapterName, idx) => {
      chapterDocs.push({
        batchId:          batchFerGirls._id,
        subject,
        chapterName,
        chapterOrder:     idx + 1,
        videoComplete:    false,
        facultyClassDone: false,
      })
    })
  }
  await BatchChapter.insertMany(chapterDocs)

  // ── IS Batch Chapters ─────────────────────────────────────────────────────
  const IS_CHAPTERS_PLUS_ONE = [
    { subject: 'Physics',   chapters: ['Physical World & Measurement', 'Kinematics', 'Laws of Motion', 'Work, Energy & Power', 'Motion of System of Particles', 'Gravitation', 'Properties of Bulk Matter', 'Thermodynamics', 'Behaviour of Perfect Gases', 'Oscillations', 'Waves'] },
    { subject: 'Chemistry', chapters: ['Some Basic Concepts of Chemistry', 'Structure of Atom', 'Classification of Elements & Periodicity', 'Chemical Bonding & Molecular Structure', 'States of Matter', 'Thermodynamics (Chem)', 'Equilibrium', 'Redox Reactions', 'Hydrogen', 'The s-Block Elements', 'Some p-Block Elements'] },
  ]
  const IS_CHAPTERS_PLUS_TWO = [
    { subject: 'Chemistry', chapters: ['Solid State', 'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'Surface Chemistry', 'General Principles of Isolation', 'p-Block Elements (12th)', 'd & f Block Elements', 'Coordination Compounds', 'Haloalkanes & Haloarenes', 'Alcohols, Phenols & Ethers', 'Aldehydes, Ketones & Carboxylic Acids', 'Amines', 'Biomolecules (Chem)', 'Polymers', 'Chemistry in Everyday Life'] },
    { subject: 'Biology',   chapters: ['Reproduction in Organisms', 'Sexual Reproduction in Flowering Plants', 'Human Reproduction', 'Reproductive Health', 'Principles of Inheritance', 'Molecular Basis of Inheritance', 'Evolution', 'Human Health & Disease', 'Strategies for Enhancement', 'Microbes in Human Welfare', 'Biotechnology: Principles', 'Biotechnology & Its Applications', 'Organisms & Populations', 'Ecosystem', 'Biodiversity & Conservation', 'Environmental Issues'] },
  ]
  const IS_CHAPTERS_IG2 = [
    { subject: 'Physics',  chapters: ['Physical World & Measurement', 'Kinematics', 'Laws of Motion', 'Work, Energy & Power', 'Gravitation', 'Properties of Bulk Matter', 'Thermodynamics', 'Waves', 'Electrostatics', 'Current Electricity', 'Magnetic Effects', 'Electromagnetic Induction', 'Optics', 'Dual Nature of Radiation', 'Atoms & Nuclei'] },
    { subject: 'Biology',  chapters: ['The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom', 'Morphology of Flowering Plants', 'Cell: The Unit of Life', 'Biomolecules', 'Cell Cycle & Division', 'Photosynthesis', 'Respiration in Plants', 'Digestion & Absorption', 'Breathing & Exchange of Gases', 'Body Fluids & Circulation', 'Excretory Products', 'Neural Control', 'Locomotion & Movement'] },
  ]

  const isChapterDocs: {
    batchId: mongoose.Types.ObjectId
    subject: string
    chapterName: string
    chapterOrder: number
    status: 'NOT_YET_SCHEDULED'
  }[] = []

  const plusOneBatches = [r1, r2, s1]
  const plusTwoBatches = [r3, s2, s3]
  const ig2Batches     = [r4, s4, s5]

  for (const batch of plusOneBatches) {
    for (const { subject, chapters } of IS_CHAPTERS_PLUS_ONE) {
      chapters.forEach((chapterName, idx) => {
        isChapterDocs.push({ batchId: batch._id, subject, chapterName, chapterOrder: idx + 1, status: 'NOT_YET_SCHEDULED' })
      })
    }
  }
  for (const batch of plusTwoBatches) {
    for (const { subject, chapters } of IS_CHAPTERS_PLUS_TWO) {
      chapters.forEach((chapterName, idx) => {
        isChapterDocs.push({ batchId: batch._id, subject, chapterName, chapterOrder: idx + 1, status: 'NOT_YET_SCHEDULED' })
      })
    }
  }
  for (const batch of ig2Batches) {
    for (const { subject, chapters } of IS_CHAPTERS_IG2) {
      chapters.forEach((chapterName, idx) => {
        isChapterDocs.push({ batchId: batch._id, subject, chapterName, chapterOrder: idx + 1, status: 'NOT_YET_SCHEDULED' })
      })
    }
  }
  await ISBatchChapter.insertMany(isChapterDocs)

  console.log('\nSeed complete')
  console.log(`Faculty records: ${facultyDocs.length} | Users: 1 (ADMIN only)`)
  console.log(`Chapters: ${chapterDocs.length} NEET chapters seeded for Feroke Girls`)
  console.log(`IS Chapters: ${isChapterDocs.length} chapters seeded across 9 IS batches`)
  console.log('\nOnly the ADMIN account is seeded:')
  console.log(`  Admin: ${adminUsername.trim().toLowerCase()} (password = SEED_ADMIN_PASSWORD) -> /admin/login`)
  console.log('\nCreate all other role accounts via the admin panel -> /admin/users')
  await mongoose.disconnect()
}

seed().catch((err) => { console.error(err); process.exit(1) })
