import 'dotenv/config'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { connectDB } from './config/db'
import { User } from './models/User'
import { Faculty } from './models/Faculty'
import { Campus } from './models/Campus'
import { Batch } from './models/Batch'
import { BatchChapter } from './models/BatchChapter'
import { PermanentFacultyContract } from './models/PermanentFacultyContract'
import { ISTimetableSlot } from './models/ISTimetableSlot'
import { ISBatchChapter } from './models/ISBatchChapter'
import { SpecialDay } from './models/SpecialDay'
import { SyllabusChapter } from './models/SyllabusChapter'
import { validatePasswordComplexity } from './utils/passwordUtils'

/** Read an integer from env, fall back to a default. */
const e = (key: string, def: number): number => {
  const v = process.env[key]
  return v !== undefined && v !== '' ? Number(v) : def
}
/** Read a string from env, fall back to a default. */
const es = (key: string, def: string): string => process.env[key] || def

async function seed() {
  await connectDB()
  console.log('Clearing existing data...')
  await Promise.all([
    User.deleteMany({}),
    Faculty.deleteMany({}),
    Campus.deleteMany({}),
    Batch.deleteMany({}),
    BatchChapter.deleteMany({}),
    SyllabusChapter.deleteMany({}),
    PermanentFacultyContract.deleteMany({}),
    ISBatchChapter.deleteMany({}),
    SpecialDay.deleteMany({}),
  ])
  // Drop old ISTimetableSlot collection to reset indexes (schema changed from dayOfWeek-based to date-based)
  await ISTimetableSlot.collection.drop().catch(() => { /* collection may not exist yet */ })

  // ── Campuses ──────────────────────────────────────────────────────────────
  // Academics campuses (Residential + Offline)
  const [
    campusFeroke, campusKottakkal, campusCalicut, campusPVT,
    campusNarikuni, campusThrissur, campusOnline,
    campusCalicutOffline, campusKottakkalOffline, campusTamilNadu, campusThrissurOffline,
    // IS campuses
    melmuri, ayikk,
  ] = await Campus.insertMany([
    // Residential
    { name: 'Feroke Campus',            location: 'Feroke' },
    { name: 'Kottakkal Campus',         location: 'Kottakkal' },
    { name: 'Calicut Campus',           location: 'Calicut' },
    { name: 'PVT Campus',               location: 'PVT' },
    { name: 'Narikuni Campus',          location: 'Narikuni' },
    { name: 'Thrissur Campus',          location: 'Thrissur' },
    { name: 'Online',                   location: 'Virtual' },
    // Offline
    { name: 'Calicut Offline Center',   location: 'Calicut' },
    { name: 'Kottakkal Offline Center', location: 'Kottakkal' },
    { name: 'Tamil Nadu Campus',        location: 'Tamil Nadu' },
    { name: 'Thrissur Offline Center',  location: 'Thrissur' },
    // Integrated School
    { name: 'IG-1',                      location: 'Melmuri' },
    { name: 'IG-2',                      location: 'Ayikkarapadi' },
  ])

  // ── Batches ───────────────────────────────────────────────────────────────
  // 8 Residential + 1 Online (PRD: "Academics Module — Repeaters, Online & Offline")
  const [
    batchFerGirls, batchKotGirls, batchKotBoys, batchCalBoys,
    batchPVTGirls, batchNarGirls, batchThrGirls, batchOnline,
    // 6 Offline
    batchCalOff1, batchCalOff2, batchKotOff1, batchKotOff2, batchTamil, batchThrOff,
    // IG batches
    r1, r2, r3, s1, s2, s3, r4, s4, s5,
  ] = await Batch.insertMany([
    // ── Residential ──────────────────────────────────────────────────────────
    { name: 'Feroke Girls',    type: 'RESIDENTIAL', campusId: campusFeroke._id },
    { name: 'Kottakkal Girls', type: 'RESIDENTIAL', campusId: campusKottakkal._id },
    { name: 'Kottakkal Boys',  type: 'RESIDENTIAL', campusId: campusKottakkal._id },
    { name: 'Calicut Boys',    type: 'RESIDENTIAL', campusId: campusCalicut._id },
    { name: 'PVT Girls',       type: 'RESIDENTIAL', campusId: campusPVT._id },
    { name: 'Narikuni Girls',  type: 'RESIDENTIAL', campusId: campusNarikuni._id },
    { name: 'Thrissur Girls',  type: 'RESIDENTIAL', campusId: campusThrissur._id },
    // ── Online ────────────────────────────────────────────────────────────────
    { name: 'Online Batch',    type: 'ONLINE',       campusId: campusOnline._id },
    // ── Offline ───────────────────────────────────────────────────────────────
    { name: 'Calicut Offline Batch 1',    type: 'OFFLINE', campusId: campusCalicutOffline._id },
    { name: 'Calicut Offline Batch 2',    type: 'OFFLINE', campusId: campusCalicutOffline._id },
    { name: 'Kottakkal Offline Batch 1',  type: 'OFFLINE', campusId: campusKottakkalOffline._id },
    { name: 'Kottakkal Offline Batch 2',  type: 'OFFLINE', campusId: campusKottakkalOffline._id },
    { name: 'Tamil Batch',                type: 'OFFLINE', campusId: campusTamilNadu._id },
    { name: 'Thrissur Offline',           type: 'OFFLINE', campusId: campusThrissurOffline._id },
    // ── Integrated School (IS) ────────────────────────────────────────────────
    { name: 'R1', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE' },
    { name: 'R2', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE' },
    { name: 'R3', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO' },
    { name: 'S1', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_ONE' },
    { name: 'S2', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO' },
    { name: 'S3', type: 'IG', campusId: melmuri._id, ig1Subgroup: 'PLUS_TWO' },
    { name: 'R4', type: 'IG', campusId: ayikk._id },
    { name: 'S4', type: 'IG', campusId: ayikk._id },
    { name: 'S5', type: 'IG', campusId: ayikk._id },
  ])
  // suppress unused-variable warnings (batches used only for coordinator batchId assignment above)
  void batchKotGirls; void batchKotBoys; void batchCalBoys
  void batchPVTGirls; void batchNarGirls; void batchThrGirls; void batchOnline
  void batchCalOff1;  void batchCalOff2;  void batchKotOff1;  void batchKotOff2
  void batchTamil;    void batchThrOff
  void r2; void r3; void s1; void s2; void s3; void s4; void s5

  // ── Faculty ───────────────────────────────────────────────────────────────
  // NOTE: subject corrections per PRD HR v1.1:
  //   Abdul Adil VK     → Biology   (was Physics)
  //   Dr. Sanoop Sebastian → Mathematics (was Biology)
  //   Fahad T           → English   (was Mathematics)
  //   Hisham Abdul Kadir → Physics, name → Hisham Abdul Kadir NP
  //   Muhsin AV         → Biology   (was Chemistry)
  //   Anand K           → Biology   (was Mathematics)
  //   Habid PP          → Chemistry (was Biology)
  //   Anoop K           → Physics   (was Chemistry)
  const facultyDocs = await Faculty.insertMany([
    // 1 – Ashraf AC
    { name: 'Ashraf AC', subject: 'Chemistry', type: 'PERMANENT', salaryModel: 'FIXED_WITH_QUOTA', fixedMonthlySalary: e('SALARY_ASHRAF_FIXED', 400000), monthlyHourQuota: e('SALARY_ASHRAF_QUOTA_HRS', 120), minDaysNormal: e('SALARY_ASHRAF_MIN_DAYS', 26) },
    // 2 – Abdul Adil VK
    { name: 'Abdul Adil VK', subject: 'Biology', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_ADIL_RATE', 1100) },
    // 3 – Dr. Sanoop Sebastian
    { name: 'Dr. Sanoop Sebastian', subject: 'Mathematics', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_SANOOP_RATE', 750) },
    // 4 – Fahad T
    { name: 'Fahad T', subject: 'English', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_FAHAD_FIXED', 17000), monthlyDayQuota: e('SALARY_FAHAD_MIN_DAYS', 8) },
    // 5 – Muhammed Ashique EK — 22-day minimum model (was leave-allowance based)
    { name: 'Muhammed Ashique EK', subject: 'Mathematics', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_ASHIQUE_FIXED', 75000), minDaysNormal: e('SALARY_ASHIQUE_MIN_DAYS', 22) },
    // 6 – Hisham Abdul Kadir NP
    { name: 'Hisham Abdul Kadir NP', subject: 'Physics', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_HISHAM_RATE', 1050) },
    // 7 – Muneeb Haneefa C
    { name: 'Muneeb Haneefa C', subject: 'Physics', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_MUNEEB_RATE', 1250), minDaysNormal: e('SALARY_MUNEEB_MIN_DAYS', 22), minDaysDryMonth: e('SALARY_MUNEEB_MIN_DAYS_DRY', 10) },
    // 8 – Fahim BM
    { name: 'Fahim BM', subject: 'Chemistry', type: 'PERMANENT', salaryModel: 'FIXED_WITH_QUOTA', fixedMonthlySalary: e('SALARY_FAHIM_FIXED', 40000), monthlyHourQuota: e('SALARY_FAHIM_OT_THRESHOLD', 50), overtimeThreshold: e('SALARY_FAHIM_OT_THRESHOLD', 50), overtimeRate: e('SALARY_FAHIM_OT_RATE', 850) },
    // 9 – Muhsin AV
    { name: 'Muhsin AV', subject: 'Biology', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_MUHSIN_RATE', 1000) },
    // 10 – Anand K
    { name: 'Anand K', subject: 'Biology', type: 'PERMANENT', salaryModel: 'FIXED_WITH_QUOTA', fixedMonthlySalary: e('SALARY_ANAND_FIXED', 120000), monthlyHourQuota: e('SALARY_ANAND_QUOTA_HRS', 135) },
    // 11 – Habid PP
    { name: 'Habid PP', subject: 'Chemistry', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_HABID_RATE', 1100) },
    // 12 – Dr. Dunoonul Shibli
    { name: 'Dr. Dunoonul Shibli', subject: 'Biology', type: 'PERMANENT', salaryModel: 'SPLIT_FIXED_VARIABLE', fixedComponent: e('SALARY_SHIBLI_FIXED_COMP', 50000), variableComponent: e('SALARY_SHIBLI_VAR_COMP', 150000), monthlyDayQuota: e('SALARY_SHIBLI_MIN_DAYS', 16), monthlyHourQuota: e('SALARY_SHIBLI_MIN_HOURS', 96) },
    // 13 – Anoop K — now SPLIT_FIXED_VARIABLE (fixedComponent 0, all ₹2L subject to
    // the day-shortfall/cancellation penalty, same rules as Shibli)
    { name: 'Anoop K', subject: 'Physics', type: 'PERMANENT', salaryModel: 'SPLIT_FIXED_VARIABLE', fixedComponent: e('SALARY_ANOOP_FIXED_COMP', 0), variableComponent: e('SALARY_ANOOP_VAR_COMP', 200000), minDaysNormal: e('SALARY_ANOOP_MIN_DAYS', 16) },
    // 14 – Jidhu
    { name: 'Jidhu', subject: 'Biology', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_JIDHU_FIXED', 110000), minDaysNormal: e('SALARY_JIDHU_MIN_DAYS', 18) },
    // 15 – Promod — at/above 135h: fixed + overtime; below 135h: pure hourly at a higher rate
    { name: 'Promod', subject: 'Physics', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_PROMOD_FIXED', 200000), overtimeThreshold: e('SALARY_PROMOD_THRESHOLD', 135), overtimeRate: e('SALARY_PROMOD_OT_RATE', 1800) },
    // 16-18 – Parvathy, Thamanna, Manju — doubt-clearance staff (Class vs Doubt Clearance rates)
    { name: 'Parvathy', subject: 'Doubt Clearance', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_DOUBT_FIXED', 20000), overtimeThreshold: e('SALARY_DOUBT_THRESHOLD', 18), overtimeRate: e('SALARY_DOUBT_OT_RATE', 300), requiresSessionCategory: true },
    { name: 'Thamanna', subject: 'Doubt Clearance', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_DOUBT_FIXED', 20000), overtimeThreshold: e('SALARY_DOUBT_THRESHOLD', 18), overtimeRate: e('SALARY_DOUBT_OT_RATE', 300), requiresSessionCategory: true },
    { name: 'Manju', subject: 'Doubt Clearance', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_DOUBT_FIXED', 20000), overtimeThreshold: e('SALARY_DOUBT_THRESHOLD', 18), overtimeRate: e('SALARY_DOUBT_OT_RATE', 300), requiresSessionCategory: true },
    // Pending (subject/rule not yet specified): Afsal Safwan, Shahid, Theertha
  ])

  // Map names → ObjectIds for contract seeding
  const byName = Object.fromEntries(facultyDocs.map((f) => [f.name, f._id]))

  // ── PermanentFacultyContracts ──────────────────────────────────────────────
  await PermanentFacultyContract.insertMany([
    { facultyId: byName['Ashraf AC'],          contractType: 'FIXED_QUOTA_CARRYFORWARD', fixedMonthlySalary: e('SALARY_ASHRAF_FIXED', 400000),         monthlyHourQuota: e('SALARY_ASHRAF_QUOTA_HRS', 120),       hasCarryForward: true, minDaysNormal: e('SALARY_ASHRAF_MIN_DAYS', 26), notes: 'Full salary paid regardless of hours. Quota deficit written to CarryForwardBalance each month. 26-day minimum is warning-only (no deduction).' },
    { facultyId: byName['Abdul Adil VK'],      contractType: 'HOURLY',                   hourlyRate: e('SALARY_ADIL_RATE', 1100),                        notes: 'Biology. ₹' + es('SALARY_ADIL_RATE', '1100') + '/hr' },
    { facultyId: byName['Dr. Sanoop Sebastian'],contractType: 'HOURLY',                  hourlyRate: e('SALARY_SANOOP_RATE', 750),                       notes: 'Mathematics. ₹' + es('SALARY_SANOOP_RATE', '750') + '/hr' },
    { facultyId: byName['Fahad T'],            contractType: 'FIXED_MONTHLY_MIN_DAYS',   fixedMonthlySalary: e('SALARY_FAHAD_FIXED', 17000),             minDaysNormal: e('SALARY_FAHAD_MIN_DAYS', 8),              notes: 'English. Fixed monthly; HR_REVIEW if < min days.' },
    { facultyId: byName['Muhammed Ashique EK'],contractType: 'FIXED_MONTHLY_MIN_DAYS',   fixedMonthlySalary: e('SALARY_ASHIQUE_FIXED', 75000),           minDaysNormal: e('SALARY_ASHIQUE_MIN_DAYS', 22),           notes: 'Mathematics. Fixed monthly; HR_REVIEW if < 22-day min (replaces the old leave-allowance model).' },
    { facultyId: byName['Hisham Abdul Kadir NP'],contractType: 'HOURLY',                 hourlyRate: e('SALARY_HISHAM_RATE', 1050),                      notes: 'Physics. ₹' + es('SALARY_HISHAM_RATE', '1050') + '/hr' },
    { facultyId: byName['Muneeb Haneefa C'],   contractType: 'HOURLY_MIN_DAYS',          hourlyRate: e('SALARY_MUNEEB_RATE', 1250),                      minDaysNormal: e('SALARY_MUNEEB_MIN_DAYS', 22),           minDaysDryMonths: e('SALARY_MUNEEB_MIN_DAYS_DRY', 10), dryMonths: [2, 3, 5], notes: 'Physics. Dry months = Feb/Mar/May.' },
    { facultyId: byName['Fahim BM'],           contractType: 'BASE_OVERTIME',            fixedMonthlySalary: e('SALARY_FAHIM_FIXED', 40000),             monthlyHourQuota: e('SALARY_FAHIM_OT_THRESHOLD', 50),     overtimeThresholdHours: e('SALARY_FAHIM_OT_THRESHOLD', 50), overtimeRatePerHour: e('SALARY_FAHIM_OT_RATE', 850), notes: 'Chemistry. Base covers quota; overtime beyond.' },
    { facultyId: byName['Muhsin AV'],          contractType: 'HOURLY',                   hourlyRate: e('SALARY_MUHSIN_RATE', 1000),                      notes: 'Biology. ₹' + es('SALARY_MUHSIN_RATE', '1000') + '/hr' },
    { facultyId: byName['Anand K'],            contractType: 'FIXED_QUOTA_NOCARRY',      fixedMonthlySalary: e('SALARY_ANAND_FIXED', 120000),            monthlyHourQuota: e('SALARY_ANAND_QUOTA_HRS', 135),        hasCarryForward: false, notes: 'Biology. Balance display only; no DB carry-forward.' },
    { facultyId: byName['Habid PP'],           contractType: 'HOURLY',                   hourlyRate: e('SALARY_HABID_RATE', 1100),                       notes: 'Chemistry. ₹' + es('SALARY_HABID_RATE', '1100') + '/hr' },
    { facultyId: byName['Dr. Dunoonul Shibli'],contractType: 'SPLIT_FIXED_VARIABLE',     fixedComponent: e('SALARY_SHIBLI_FIXED_COMP', 50000),           variableComponent: e('SALARY_SHIBLI_VAR_COMP', 150000),   cancellationPenaltyPerClass: e('SALARY_SHIBLI_CANCEL_PENALTY', 9000), minDaysNormal: e('SALARY_SHIBLI_MIN_DAYS', 16), minHoursRequirement: e('SALARY_SHIBLI_MIN_HOURS', 96), notes: 'Biology. Variable reduced by ₹9,000 per faculty-cancelled class OR per day short of the 16-day minimum.' },
    { facultyId: byName['Anoop K'],            contractType: 'SPLIT_FIXED_VARIABLE',     fixedComponent: e('SALARY_ANOOP_FIXED_COMP', 0),                variableComponent: e('SALARY_ANOOP_VAR_COMP', 200000),    cancellationPenaltyPerClass: e('SALARY_ANOOP_CANCEL_PENALTY', 9000), minDaysNormal: e('SALARY_ANOOP_MIN_DAYS', 16), minHoursRequirement: e('SALARY_ANOOP_MIN_HOURS', 96), notes: 'Physics. Same rules as Shibli: ₹9,000 per cancelled class OR per day short of the 16-day minimum.' },
    { facultyId: byName['Jidhu'],              contractType: 'FIXED_MONTHLY_MIN_DAYS',   fixedMonthlySalary: e('SALARY_JIDHU_FIXED', 110000),            minDaysNormal: e('SALARY_JIDHU_MIN_DAYS', 18),             minHoursRequirement: e('SALARY_JIDHU_MIN_HOURS', 108), notes: 'Biology. Fixed monthly; HR_REVIEW if < 18 days or < 108 hours.' },
    { facultyId: byName['Promod'],             contractType: 'BASE_OVERTIME_SHORTFALL',  fixedMonthlySalary: e('SALARY_PROMOD_FIXED', 200000),           overtimeThresholdHours: e('SALARY_PROMOD_THRESHOLD', 135), overtimeRatePerHour: e('SALARY_PROMOD_OT_RATE', 1800), shortfallRatePerHour: e('SALARY_PROMOD_SHORTFALL_RATE', 2000), notes: 'Physics. At/above 135h: ₹2,00,000 + ₹1,800/hr overtime. Below 135h: hoursLogged × ₹2,000/hr instead.' },
    { facultyId: byName['Parvathy'],           contractType: 'DOUBT_CLEARANCE_SPLIT_RATE', fixedMonthlySalary: e('SALARY_DOUBT_FIXED', 20000),           overtimeThresholdHours: e('SALARY_DOUBT_THRESHOLD', 18), overtimeRatePerHour: e('SALARY_DOUBT_OT_RATE', 300), classRatePerHour: e('SALARY_DOUBT_CLASS_RATE', 550), notes: 'Doubt clearance. ₹20,000 flat for up to 18 doubt hours, ₹300/hr beyond; ₹550/hr for every class hour.' },
    { facultyId: byName['Thamanna'],           contractType: 'DOUBT_CLEARANCE_SPLIT_RATE', fixedMonthlySalary: e('SALARY_DOUBT_FIXED', 20000),           overtimeThresholdHours: e('SALARY_DOUBT_THRESHOLD', 18), overtimeRatePerHour: e('SALARY_DOUBT_OT_RATE', 300), classRatePerHour: e('SALARY_DOUBT_CLASS_RATE', 550), notes: 'Doubt clearance. ₹20,000 flat for up to 18 doubt hours, ₹300/hr beyond; ₹550/hr for every class hour.' },
    { facultyId: byName['Manju'],              contractType: 'DOUBT_CLEARANCE_SPLIT_RATE', fixedMonthlySalary: e('SALARY_DOUBT_FIXED', 20000),           overtimeThresholdHours: e('SALARY_DOUBT_THRESHOLD', 18), overtimeRatePerHour: e('SALARY_DOUBT_OT_RATE', 300), classRatePerHour: e('SALARY_DOUBT_CLASS_RATE', 550), notes: 'Doubt clearance. ₹20,000 flat for up to 18 doubt hours, ₹300/hr beyond; ₹550/hr for every class hour.' },
  ])

  // ── Users ─────────────────────────────────────────────────────────────────
  // Only the ADMIN account is seeded. All other role accounts (HR managers,
  // academics managers, coordinators, faculty logins) are created by the admin
  // at runtime via /admin/users — each role can have one or more people.
  const hash = (p: string) => bcrypt.hash(p, 12)

  const adminPwdRaw = es('SEED_ADMIN_PASSWORD', 'Dopa@Admin1!')

  // Enforce the same complexity policy that createUser/changePassword use.
  const adminPwdError = validatePasswordComplexity(adminPwdRaw)
  if (adminPwdError) throw new Error(`SEED_ADMIN_PASSWORD fails complexity check: ${adminPwdError}`)

  const adminPwd = await hash(adminPwdRaw)
  const adminUsername = es('SEED_ADMIN_USERNAME', 'it@dopacoaching.com')

  // ADMIN — full access; logs in via /admin/login only.
  await User.create({ username: adminUsername.trim().toLowerCase(), passwordHash: adminPwd, role: 'ADMIN' })

  // ── BatchChapters (demo chapters for Feroke Girls — RESIDENTIAL) ─────────────
  // Pre-seed chapters so the video-first workflow is immediately usable.
  // Coordinator marks videoComplete → then logs session.
  // (Other batches will auto-accumulate chapters as sessions are logged.)
  const NEET_CHAPTERS: { subject: string; chapters: string[] }[] = [
    {
      subject: 'Physics',
      chapters: [
        'Physical World & Measurement',
        'Kinematics',
        'Laws of Motion',
        'Work, Energy & Power',
        'Motion of System of Particles',
        'Gravitation',
        'Properties of Bulk Matter',
        'Thermodynamics',
        'Behaviour of Perfect Gases',
        'Oscillations',
        'Waves',
      ],
    },
    {
      subject: 'Chemistry',
      chapters: [
        'Some Basic Concepts of Chemistry',
        'Structure of Atom',
        'Classification of Elements & Periodicity',
        'Chemical Bonding & Molecular Structure',
        'States of Matter',
        'Thermodynamics',
        'Equilibrium',
        'Redox Reactions',
        'Hydrogen',
        'The s-Block Elements',
        'Some p-Block Elements',
        'Organic Chemistry — Basic Principles',
        'Hydrocarbons',
        'Environmental Chemistry',
      ],
    },
    {
      subject: 'Biology',
      chapters: [
        'The Living World',
        'Biological Classification',
        'Plant Kingdom',
        'Animal Kingdom',
        'Morphology of Flowering Plants',
        'Anatomy of Flowering Plants',
        'Structural Organisation in Animals',
        'Cell: The Unit of Life',
        'Biomolecules',
        'Cell Cycle & Cell Division',
        'Transport in Plants',
        'Mineral Nutrition',
        'Photosynthesis in Higher Plants',
        'Respiration in Plants',
        'Plant Growth & Development',
        'Digestion & Absorption',
        'Breathing & Exchange of Gases',
        'Body Fluids & Circulation',
        'Excretory Products & their Elimination',
        'Locomotion & Movement',
        'Neural Control & Coordination',
        'Chemical Coordination & Integration',
      ],
    },
  ]

  // Insert chapters for Feroke Girls (residential) batch with videoComplete=false
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
        batchId:         batchFerGirls._id,
        // UPPERCASE — session logging and the video-first gate normalise
        // BatchChapter.subject to uppercase, so the seed must match.
        subject:         subject.toUpperCase(),
        chapterName,
        chapterOrder:    idx + 1,
        videoComplete:   false,
        facultyClassDone: false,
      })
    })
  }
  await BatchChapter.insertMany(chapterDocs)

  // ── IS Batch Chapters ─────────────────────────────────────────────────────
  // Seed NEET chapters for all IS batches (no video gate — status-based only).
  // Plus One batches: Physics + Chemistry (11th syllabus focus)
  // Plus Two batches: Chemistry + Biology (12th syllabus focus)
  // IG2 batches (no subgroup): Physics + Biology
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

  // Security: never log plaintext passwords to stdout.
  // Distribute credentials out-of-band (e.g. a password manager or secure file).
  console.log('\nSeed complete ✓')
  console.log(`Faculty records: ${facultyDocs.length} | Users: 1 (ADMIN only)`)
  console.log(`Chapters: ${chapterDocs.length} NEET chapters seeded for Feroke Girls (all videoComplete=false)`)
  console.log(`IS Chapters: ${isChapterDocs.length} chapters seeded across 9 IS batches (status: NOT_YET_SCHEDULED)`)
  console.log('\nOnly the ADMIN account is seeded:')
  console.log(`  Admin:  ${adminUsername.trim().toLowerCase()}   (password = SEED_ADMIN_PASSWORD)  → log in at /admin/login`)
  console.log('\nCreate all other role accounts (HR, Academics, IS, Coordinators, Faculty)')
  console.log('via the admin panel → /admin/users. Each role supports multiple people.')
  console.log('⚠  Change the admin password before going live.')
  await mongoose.disconnect()
}

seed().catch((e) => { console.error(e); process.exit(1) })
