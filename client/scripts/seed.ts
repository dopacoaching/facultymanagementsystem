import { config } from 'dotenv'
// Load .env.local before any other imports so env vars are available
config({ path: '.env.local' })

import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../src/lib/models/User'
import { Faculty } from '../src/lib/models/Faculty'
import { Campus } from '../src/lib/models/Campus'
import { Batch } from '../src/lib/models/Batch'
import { BatchChapter } from '../src/lib/models/BatchChapter'
import { PermanentFacultyContract } from '../src/lib/models/PermanentFacultyContract'
import { ISTimetableSlot } from '../src/lib/models/ISTimetableSlot'
import { ISBatchChapter } from '../src/lib/models/ISBatchChapter'
import { SpecialDay } from '../src/lib/models/SpecialDay'
import { validatePasswordComplexity } from '../src/lib/utils/passwordUtils'

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
  // R = Plus Two (+2), S = Plus One (+1)
  // R3 = JEE Plus Two, S3 = JEE Plus One, all others = NEET
  const [
    batchFerGirls, batchKotGirls, batchKotBoys, batchCalBoys,
    batchPVTGirls, batchNarGirls, batchThrGirls, batchOnline,
    batchCalOff1, batchCalOff2, batchKotOff1, batchKotOff2, batchTamil, batchThrOff,
    r1, r2, r3, s1, s2, s3, r4, s4, s5,
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
    { name: 'R1', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO', stream: 'NEET' },
    { name: 'R2', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO', stream: 'NEET' },
    { name: 'R3', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO', stream: 'JEE'  },
    { name: 'S1', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE', stream: 'NEET' },
    { name: 'S2', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE', stream: 'NEET' },
    { name: 'S3', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE', stream: 'JEE'  },
    { name: 'R4', type: 'IG', campusId: ayikk._id,   ig1Subgroup: 'PLUS_TWO', stream: 'NEET' },
    { name: 'S4', type: 'IG', campusId: ayikk._id,   ig1Subgroup: 'PLUS_ONE', stream: 'NEET' },
    { name: 'S5', type: 'IG', campusId: ayikk._id,   ig1Subgroup: 'PLUS_ONE', stream: 'NEET' },
  ])
  void batchKotGirls; void batchKotBoys; void batchCalBoys
  void batchPVTGirls; void batchNarGirls; void batchThrGirls; void batchOnline
  void batchCalOff1;  void batchCalOff2;  void batchKotOff1;  void batchKotOff2
  void batchTamil;    void batchThrOff
  void r2; void s1; void s2; void s4; void s5

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
        // UPPERCASE — session logging and the video-first gate normalise
        // BatchChapter.subject to uppercase, so the seed must match.
        subject:          subject.toUpperCase(),
        chapterName,
        chapterOrder:     idx + 1,
        videoComplete:    false,
        facultyClassDone: false,
      })
    })
  }
  await BatchChapter.insertMany(chapterDocs)

  // ── IS Batch Chapters — keyed by yearly plan ──────────────────────────────
  // Each entry: [chapterName, scheduledModule, durationHours]

  // ── PLUS ONE NEET ──────────────────────────────────────────────────────────
  const P1_NEET: { subject: string; chapters: [string, number, number][] }[] = [
    { subject: 'Physics', chapters: [
      ['Units & Measurements',                         1, 14],
      ['Motion in a Straight Line',                    1, 18],
      ['Motion in a Plane',                            2, 18],
      ['Laws of Motion',                               2, 20],
      ['Work, Energy & Power',                         3, 18],
      ['System of Particles and Rotational Motion',    3, 22],
      ['Gravitation',                                  4, 15],
      ['Mechanical Properties of Solids',              4, 10],
      ['Mechanical Properties of Fluids',              5, 22],
      ['Thermal Properties of Matter',                 5, 16],
      ['Thermodynamics',                               5, 12],
      ['Kinetic Theory',                               6,  6],
      ['Oscillations',                                 6, 12],
      ['Waves',                                        6, 12],
    ]},
    { subject: 'Chemistry', chapters: [
      ['Some Basic Concepts of Chemistry',                             1, 12],
      ['Structure of Atom',                                            2, 18],
      ['Classification of Elements and Periodicity in Properties',    2,  8],
      ['Chemical Bonding & Molecular Structure',                       3, 12],
      ['Thermodynamics',                                               3, 12],
      ['Equilibrium',                                                  4, 18],
      ['Redox Reactions',                                              4, 10],
      ['Organic Chemistry — Some Basic Principles and Techniques',    5, 24],
      ['Hydrocarbons',                                                 6, 12],
    ]},
    { subject: 'Botany', chapters: [
      ['Biological Classification',          1, 10],
      ['Morphology of Flowering Plants',     2, 10],
      ['Plant Kingdom',                      2,  7],
      ['Cell the Unit of Life',              3, 10],
      ['Cell Cycle and Cell Division',       4,  8],
      ['Photosynthesis in Higher Plants',    4, 12],
      ['Respiration in Plants',              5, 10],
      ['Plant Growth & Development',         6, 10],
    ]},
    { subject: 'Zoology', chapters: [
      ['The Living World',                              1,  7],
      ['Animal Kingdom',                                2, 15],
      ['Locomotion and Movement',                       3,  8],
      ['Biomolecules',                                  3, 12],
      ['Neural Control and Coordination',               4,  6],
      ['Excretory Products and Their Elimination',      4,  8],
      ['Chemical Coordination and Integration',         5,  8],
      ['Breathing and Exchange of Gases',               6,  8],
      ['Body Fluids and Their Circulation',             6, 10],
    ]},
    { subject: 'Maths', chapters: [
      ['Sets',                         1, 10],
      ['Relations and Functions',      1, 15],
      ['Complex Numbers',              2,  9],
      ['Trigonometric Functions',      2, 20],
      ['Binomial Theorem',             3,  6],
      ['Linear Inequalities',          3,  6],
      ['Permutation and Combinations', 4, 12],
      ['Sequences and Series',         4, 12],
      ['Straight Lines',               5, 15],
      ['Conic Sections',               5, 16],
      ['Introduction to 3D',           5,  6],
      ['Limits and Derivatives',       6,  0],
      ['Statistics',                   6,  0],
      ['Probability',                  6,  0],
    ]},
  ]

  // ── PLUS ONE JEE ───────────────────────────────────────────────────────────
  // Physics & Chemistry same as NEET; Maths hours differ
  const P1_JEE: { subject: string; chapters: [string, number, number][] }[] = [
    { subject: 'Physics',   chapters: P1_NEET[0].chapters },
    { subject: 'Chemistry', chapters: P1_NEET[1].chapters },
    { subject: 'Maths', chapters: [
      ['Sets',                         1, 15],
      ['Relations and Functions',      1, 25],
      ['Complex Numbers',              2, 15],
      ['Trigonometric Functions',      2, 30],
      ['Binomial Theorem',             3, 12],
      ['Linear Inequalities',          3, 12],
      ['Permutation and Combinations', 4, 18],
      ['Sequences and Series',         4, 18],
      ['Straight Lines',               5, 22],
      ['Conic Sections',               5, 22],
      ['Introduction to 3D',           5, 12],
      ['Limits and Derivatives',       6,  0],
      ['Statistics',                   6,  0],
      ['Probability',                  6,  0],
    ]},
  ]

  // ── PLUS TWO NEET ──────────────────────────────────────────────────────────
  const P2_NEET: { subject: string; chapters: [string, number, number][] }[] = [
    { subject: 'Physics', chapters: [
      ['Electric Charges and Fields',                  1, 15],
      ['Electrostatic Potential and Capacitance',      1, 15],
      ['Current Electricity',                          1, 15],
      ['Moving Charges and Magnetism',                 2, 16],
      ['Magnetism and Matter',                         2, 10],
      ['EMI',                                          3,  9],
      ['Alternating Current',                          3, 15],
      ['EM Waves',                                     3,  8],
      ['Ray Optics',                                   4, 20],
      ['Wave Optics',                                  4, 12],
      ['Dual Nature of Radiation and Matter',          4,  8],
      ['Atoms',                                        5,  9],
      ['Nuclei',                                       5,  6],
      ['Semiconductors',                               5, 12],
    ]},
    { subject: 'Chemistry', chapters: [
      ['Electrochemistry',                             1, 12],
      ['D & F Block Elements',                         1, 10],
      ['Chemical Kinetics',                            1, 10],
      ['Solutions',                                    1, 12],
      ['Haloalkanes & Haloarenes',                     2, 12],
      ['Coordination Compounds',                       3, 10],
      ['Alcohols, Phenols & Ethers',                   3, 10],
      ['Aldehydes, Ketones & Carboxylic Acids',        4, 12],
      ['Amines',                                       5,  6],
      ['Biomolecules',                                 5,  6],
    ]},
    { subject: 'Botany', chapters: [
      ['Sexual Reproduction in Flowering Plants',      1, 12],
      ['Biotechnology — Principles and Processes',     2, 10],
      ['Biotechnology and Its Applications',           3,  0],
      ['Organisms and Populations',                    4, 12],
      ['Ecosystem',                                    5,  8],
    ]},
    { subject: 'Zoology', chapters: [
      ['Human Reproduction',                           1, 12],
      ['Reproductive Health',                          1,  6],
      ['Principles of Inheritance and Variation',      2, 15],
      ['Human Health and Diseases',                    3, 12],
      ['Molecular Basis of Inheritance',               4, 17],
      ['Evolution',                                    5, 12],
      ['Microbes in Human Welfare',                    5,  6],
      ['Biodiversity and Conservation',                5,  6],
    ]},
    { subject: 'Maths', chapters: [
      ['Relations and Functions',          1, 12],
      ['Matrices',                         1, 12],
      ['Inverse Trigonometric Functions',  1, 12],
      ['Determinants',                     2, 10],
      ['Continuity and Differentiability', 2, 18],
      ['Vector Algebra',                   2, 12],
      ['Integrals',                        3, 32],
      ['3D Geometry',                      3,  6],
      ['Differential Equations',           4, 14],
      ['Application of Derivatives',       4, 18],
      ['LPP',                              4,  6],
      ['Application of Integrals',         5, 10],
      ['Probability',                      5, 12],
    ]},
  ]

  // ── PLUS TWO JEE ───────────────────────────────────────────────────────────
  // Physics, Chemistry & Maths same as NEET; no Botany/Zoology
  const P2_JEE: { subject: string; chapters: [string, number, number][] }[] = [
    { subject: 'Physics',   chapters: P2_NEET[0].chapters },
    { subject: 'Chemistry', chapters: P2_NEET[1].chapters },
    { subject: 'Maths',     chapters: P2_NEET[4].chapters },
  ]

  type ISChapterRow = {
    batchId:        mongoose.Types.ObjectId
    subject:        string
    chapterName:    string
    chapterOrder:   number
    scheduledModule: number
    durationHours:  number
    status:         'NOT_YET_SCHEDULED'
  }

  function buildChapters(
    batchId: mongoose.Types.ObjectId,
    plan: { subject: string; chapters: [string, number, number][] }[],
  ): ISChapterRow[] {
    const rows: ISChapterRow[] = []
    for (const { subject, chapters } of plan) {
      chapters.forEach(([chapterName, scheduledModule, durationHours], idx) => {
        rows.push({ batchId, subject, chapterName, chapterOrder: idx + 1, scheduledModule, durationHours, status: 'NOT_YET_SCHEDULED' })
      })
    }
    return rows
  }

  const isChapterDocs: ISChapterRow[] = [
    // Plus Two NEET: R1, R2, R4
    ...buildChapters(r1._id, P2_NEET),
    ...buildChapters(r2._id, P2_NEET),
    ...buildChapters(r4._id, P2_NEET),
    // Plus Two JEE: R3
    ...buildChapters(r3._id, P2_JEE),
    // Plus One NEET: S1, S2, S4, S5
    ...buildChapters(s1._id, P1_NEET),
    ...buildChapters(s2._id, P1_NEET),
    ...buildChapters(s4._id, P1_NEET),
    ...buildChapters(s5._id, P1_NEET),
    // Plus One JEE: S3
    ...buildChapters(s3._id, P1_JEE),
  ]
  await ISBatchChapter.insertMany(isChapterDocs)

  console.log('\nSeed complete')
  console.log(`Faculty records: ${facultyDocs.length} (${facultyDocs.map((f: {name:string}) => f.name).join(', ')}) | Users: 1 (ADMIN only)`)
  console.log(`Chapters: ${chapterDocs.length} NEET chapters seeded for Feroke Girls`)
  console.log(`IS Chapters: ${isChapterDocs.length} chapters seeded across 9 IS batches`)
  console.log('  R1, R2, R4 → Plus Two NEET (Physics/Chemistry/Botany/Zoology/Maths)')
  console.log('  R3         → Plus Two JEE  (Physics/Chemistry/Maths)')
  console.log('  S1, S2, S4, S5 → Plus One NEET (Physics/Chemistry/Botany/Zoology/Maths)')
  console.log('  S3         → Plus One JEE  (Physics/Chemistry/Maths)')
  console.log('\nOnly the ADMIN account is seeded:')
  console.log(`  Admin: ${adminUsername.trim().toLowerCase()} (password = SEED_ADMIN_PASSWORD) -> /admin/login`)
  console.log('\nCreate all other role accounts via the admin panel -> /admin/users')
  await mongoose.disconnect()
}

seed().catch((err) => { console.error(err); process.exit(1) })
