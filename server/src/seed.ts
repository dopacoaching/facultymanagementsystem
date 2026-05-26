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
    { name: 'IG1 — Melmuri-27',         location: 'Melmuri' },
    { name: 'IG2 — Ayikkarapadi',        location: 'Ayikkarapadi' },
  ])

  // ── Batches ───────────────────────────────────────────────────────────────
  // 8 Residential + 1 Online (PRD: "Academics Module — Repeaters, Online & Offline")
  const [
    batchFerGirls, batchKotGirls, batchKotBoys, batchCalBoys,
    batchPVTGirls, batchNarGirls, batchThrGirls, batchOnline,
    // 6 Offline
    batchCalOff1, batchCalOff2, batchKotOff1, batchKotOff2, batchTamil, batchThrOff,
    // IS batches
    resCalicut, r1, r2, r3, s1, s2, s3, r4, s4, s5,
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
    { name: 'Feroke Girls IS', type: 'INTEGRATED_SCHOOL', campusId: campusFeroke._id },
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
  // suppress unused-variable warnings (batches used only for coordinator batchId assignment above)
  void batchKotGirls; void batchKotBoys; void batchCalBoys
  void batchPVTGirls; void batchNarGirls; void batchThrGirls; void batchOnline
  void batchCalOff1;  void batchCalOff2;  void batchKotOff1;  void batchKotOff2
  void batchTamil;    void batchThrOff;   void resCalicut
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
    { name: 'Ashraf AC', subject: 'Chemistry', type: 'PERMANENT', salaryModel: 'FIXED_WITH_QUOTA', fixedMonthlySalary: e('SALARY_ASHRAF_FIXED', 400000), monthlyHourQuota: e('SALARY_ASHRAF_QUOTA_HRS', 120) },
    // 2 – Abdul Adil VK
    { name: 'Abdul Adil VK', subject: 'Biology', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_ADIL_RATE', 1100) },
    // 3 – Dr. Sanoop Sebastian
    { name: 'Dr. Sanoop Sebastian', subject: 'Mathematics', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_SANOOP_RATE', 750) },
    // 4 – Fahad T
    { name: 'Fahad T', subject: 'English', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_FAHAD_FIXED', 17000), monthlyDayQuota: e('SALARY_FAHAD_MIN_DAYS', 8) },
    // 5 – Muhammed Ashique EK
    { name: 'Muhammed Ashique EK', subject: 'Mathematics', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_ASHIQUE_FIXED', 75000), monthlyLeaveAllowance: e('SALARY_ASHIQUE_MONTHLY_LEAVE', 8), aprilLeaveAllowance: e('SALARY_ASHIQUE_APRIL_LEAVE', 4) },
    // 6 – Hisham Abdul Kadir NP
    { name: 'Hisham Abdul Kadir NP', subject: 'Physics', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_HISHAM_RATE', 900) },
    // 7 – Muneeb Haneefa C
    { name: 'Muneeb Haneefa C', subject: 'Physics', type: 'PERMANENT', salaryModel: 'HOURLY', hourlyRate: e('SALARY_MUNEEB_RATE', 1150), minDaysNormal: e('SALARY_MUNEEB_MIN_DAYS', 22), minDaysDryMonth: e('SALARY_MUNEEB_MIN_DAYS_DRY', 10) },
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
    // 13 – Anoop K
    { name: 'Anoop K', subject: 'Physics', type: 'PERMANENT', salaryModel: 'FIXED_MONTHLY', fixedMonthlySalary: e('SALARY_ANOOP_FIXED', 200000), monthlyDayQuota: e('SALARY_ANOOP_MIN_DAYS', 16) },
    // 14 – Dileep (TBD — configurable, pending setup)
    { name: 'Dileep', subject: 'TBD', type: 'PERMANENT', salaryModel: 'CONFIGURABLE' },
  ])

  // Map names → ObjectIds for contract seeding
  const byName = Object.fromEntries(facultyDocs.map((f) => [f.name, f._id]))

  // ── PermanentFacultyContracts ──────────────────────────────────────────────
  await PermanentFacultyContract.insertMany([
    { facultyId: byName['Ashraf AC'],          contractType: 'FIXED_QUOTA_CARRYFORWARD', fixedMonthlySalary: e('SALARY_ASHRAF_FIXED', 400000),         monthlyHourQuota: e('SALARY_ASHRAF_QUOTA_HRS', 120),       hasCarryForward: true, notes: 'Full salary paid regardless of hours. Quota deficit written to CarryForwardBalance each month.' },
    { facultyId: byName['Abdul Adil VK'],      contractType: 'HOURLY',                   hourlyRate: e('SALARY_ADIL_RATE', 1100),                        notes: 'Biology. ₹' + es('SALARY_ADIL_RATE', '1100') + '/hr' },
    { facultyId: byName['Dr. Sanoop Sebastian'],contractType: 'HOURLY',                  hourlyRate: e('SALARY_SANOOP_RATE', 750),                       notes: 'Mathematics. ₹' + es('SALARY_SANOOP_RATE', '750') + '/hr' },
    { facultyId: byName['Fahad T'],            contractType: 'FIXED_MONTHLY_MIN_DAYS',   fixedMonthlySalary: e('SALARY_FAHAD_FIXED', 17000),             minDaysNormal: e('SALARY_FAHAD_MIN_DAYS', 8),              notes: 'English. Fixed monthly; HR_REVIEW if < min days.' },
    { facultyId: byName['Muhammed Ashique EK'],contractType: 'FIXED_MONTHLY_LEAVE',      fixedMonthlySalary: e('SALARY_ASHIQUE_FIXED', 75000),           monthlyLeaveAllowance: e('SALARY_ASHIQUE_MONTHLY_LEAVE', 8), aprilLeaveAllowance: e('SALARY_ASHIQUE_APRIL_LEAVE', 4), notes: 'Mathematics. Pro-rata deduction for excess leaves.' },
    { facultyId: byName['Hisham Abdul Kadir NP'],contractType: 'HOURLY',                 hourlyRate: e('SALARY_HISHAM_RATE', 900),                       notes: 'Physics. ₹' + es('SALARY_HISHAM_RATE', '900') + '/hr' },
    { facultyId: byName['Muneeb Haneefa C'],   contractType: 'HOURLY_MIN_DAYS',          hourlyRate: e('SALARY_MUNEEB_RATE', 1150),                      minDaysNormal: e('SALARY_MUNEEB_MIN_DAYS', 22),           minDaysDryMonths: e('SALARY_MUNEEB_MIN_DAYS_DRY', 10), dryMonths: [2, 3, 5], notes: 'Physics. Dry months = Feb/Mar/May.' },
    { facultyId: byName['Fahim BM'],           contractType: 'BASE_OVERTIME',            fixedMonthlySalary: e('SALARY_FAHIM_FIXED', 40000),             monthlyHourQuota: e('SALARY_FAHIM_OT_THRESHOLD', 50),     overtimeThresholdHours: e('SALARY_FAHIM_OT_THRESHOLD', 50), overtimeRatePerHour: e('SALARY_FAHIM_OT_RATE', 850), notes: 'Chemistry. Base covers quota; overtime beyond.' },
    { facultyId: byName['Muhsin AV'],          contractType: 'HOURLY',                   hourlyRate: e('SALARY_MUHSIN_RATE', 1000),                      notes: 'Biology. ₹' + es('SALARY_MUHSIN_RATE', '1000') + '/hr' },
    { facultyId: byName['Anand K'],            contractType: 'FIXED_QUOTA_NOCARRY',      fixedMonthlySalary: e('SALARY_ANAND_FIXED', 120000),            monthlyHourQuota: e('SALARY_ANAND_QUOTA_HRS', 135),        hasCarryForward: false, notes: 'Biology. Balance display only; no DB carry-forward.' },
    { facultyId: byName['Habid PP'],           contractType: 'HOURLY',                   hourlyRate: e('SALARY_HABID_RATE', 1100),                       notes: 'Chemistry. ₹' + es('SALARY_HABID_RATE', '1100') + '/hr' },
    { facultyId: byName['Dr. Dunoonul Shibli'],contractType: 'SPLIT_FIXED_VARIABLE',     fixedComponent: e('SALARY_SHIBLI_FIXED_COMP', 50000),           variableComponent: e('SALARY_SHIBLI_VAR_COMP', 150000),   cancellationPenaltyPerClass: e('SALARY_SHIBLI_CANCEL_PENALTY', 9000), minDaysNormal: e('SALARY_SHIBLI_MIN_DAYS', 16), minHoursRequirement: e('SALARY_SHIBLI_MIN_HOURS', 96), notes: 'Biology. Variable reduced by penalty per faculty-cancelled class.' },
    { facultyId: byName['Anoop K'],            contractType: 'FIXED_MONTHLY_MIN_DAYS',   fixedMonthlySalary: e('SALARY_ANOOP_FIXED', 200000),            minDaysNormal: e('SALARY_ANOOP_MIN_DAYS', 16),             notes: 'Physics. Fixed monthly; HR_REVIEW if < min days.' },
    { facultyId: byName['Dileep'],             contractType: 'CONFIGURABLE',             isConfigured: false,                                            notes: 'TBD. Pay structure to be configured by HR.' },
  ])

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = (p: string) => bcrypt.hash(p, 12)

  const adminPwd   = await hash(es('SEED_ADMIN_PASSWORD',  'dopa@1234'))
  const mgmtPwd    = await hash(es('SEED_MGMT_PASSWORD',   'dopa@1234'))
  const facultyPwd = await hash(es('SEED_FACULTY_PASSWORD','faculty123'))

  // Usernames are configurable via env so they can be changed without code changes
  const adminUsername    = es('SEED_ADMIN_USERNAME',       'it@dopacoaching.com')
  const hrUsername       = es('SEED_HR_USERNAME',          'admin_hr')
  const repeatersUsername = es('SEED_REPEATERS_USERNAME',  'repeaters')
  const isAcUsername     = es('SEED_IS_ACADEMIC_USERNAME', 'academicis')

  // Management accounts:
  //   [ADMIN]             → full access to everything (login via /admin/login only)
  //   [HR_MANAGER]        → salary, payroll, audit
  //   [ACADEMICS_MANAGER] → Repeaters/DOPA sessions, schedule, exam topics
  //   [IS_ACADEMICS_MANAGER] → Integrated School sessions, timetable
  //   coordinator_calicut → COORDINATOR (Feroke Girls residential campus — academics)
  //   coordinator_melmuri → IS_COORDINATOR (IG1 Melmuri — IS campus)
  //   coordinator_ayikk   → IS_COORDINATOR (IG2 Ayikkarapadi — IS campus)
  await User.insertMany([
    { username: adminUsername,         passwordHash: adminPwd,   role: 'ADMIN' },
    { username: hrUsername,            passwordHash: mgmtPwd,    role: 'HR_MANAGER' },
    { username: repeatersUsername,     passwordHash: mgmtPwd,    role: 'ACADEMICS_MANAGER' },
    { username: isAcUsername,          passwordHash: mgmtPwd,    role: 'IS_ACADEMICS_MANAGER' },
    // Academics coordinator — assigned to Feroke Girls (RESIDENTIAL)
    { username: 'coordinator_calicut', passwordHash: mgmtPwd,    role: 'COORDINATOR',    batchId: batchFerGirls._id },
    // IS coordinators — assigned to their IS campus batches
    { username: 'coordinator_melmuri', passwordHash: mgmtPwd,    role: 'IS_COORDINATOR', batchId: r1._id },
    { username: 'coordinator_ayikk',   passwordHash: mgmtPwd,    role: 'IS_COORDINATOR', batchId: r4._id },
  ])

  // Faculty accounts — each linked to their Faculty document via facultyId
  // Default password from SEED_FACULTY_PASSWORD env var (HR should change after first login)
  await User.insertMany([
    { username: 'ashraf_ac',    passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Ashraf AC'] },
    { username: 'adil_vk',      passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Abdul Adil VK'] },
    { username: 'sanoop',       passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Dr. Sanoop Sebastian'] },
    { username: 'fahad_t',      passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Fahad T'] },
    { username: 'ashique_ek',   passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Muhammed Ashique EK'] },
    { username: 'hisham_np',    passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Hisham Abdul Kadir NP'] },
    { username: 'muneeb_c',     passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Muneeb Haneefa C'] },
    { username: 'fahim_bm',     passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Fahim BM'] },
    { username: 'muhsin_av',    passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Muhsin AV'] },
    { username: 'anand_k',      passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Anand K'] },
    { username: 'habid_pp',     passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Habid PP'] },
    { username: 'shibli',       passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Dr. Dunoonul Shibli'] },
    { username: 'anoop_k',      passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Anoop K'] },
    { username: 'dileep',       passwordHash: facultyPwd, role: 'FACULTY', facultyId: byName['Dileep'] },
  ])

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
        subject,
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

  console.log('\nSeed complete ✓')
  console.log(`── Admin (login via /admin/login, password: ${es('SEED_ADMIN_PASSWORD', 'dopa@1234')}) ────`)
  console.log(`  ${adminUsername}`)
  console.log(`── HR Manager (password: ${es('SEED_MGMT_PASSWORD', 'dopa@1234')}) ────────────────────────`)
  console.log(`  ${hrUsername}`)
  console.log(`── Academics — Repeaters (password: same) ──────────────────────────`)
  console.log(`  ${repeatersUsername}`)
  console.log(`── Academics — Integrated School (password: same) ──────────────────`)
  console.log(`  ${isAcUsername}`)
  console.log(`── Coordinators (password: same) ───────────────────────────────────`)
  console.log('  coordinator_calicut | coordinator_melmuri | coordinator_ayikk')
  console.log(`── Faculty (password: ${es('SEED_FACULTY_PASSWORD', 'faculty123')}) ─────────────────────────`)
  console.log('  ashraf_ac | adil_vk | sanoop | fahad_t | ashique_ek | hisham_np')
  console.log('  muneeb_c  | fahim_bm | muhsin_av | anand_k | habid_pp | shibli')
  console.log('  anoop_k   | dileep')
  console.log(`────────────────────────────────────────────────────────────────────`)
  console.log(`Faculty: ${facultyDocs.length} | Users: 1 admin + 4 management + 3 coordinators + 14 faculty`)
  console.log(`Chapters: ${chapterDocs.length} NEET chapters seeded for Feroke Girls (all videoComplete=false)`)
  console.log(`IS Chapters: ${isChapterDocs.length} chapters seeded across 9 IS batches (status: NOT_YET_SCHEDULED)`)
  await mongoose.disconnect()
}

seed().catch((e) => { console.error(e); process.exit(1) })
