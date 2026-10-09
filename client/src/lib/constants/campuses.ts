export interface CampusConfig {
  campusName: string
  /** Login username for this campus's shared account (lowercase, matches User.username). */
  username: string
  /** Class teachers at this campus — populates the "Updated by" dropdown. */
  teachers: string[]
  /** Campus._id whose batches this login picks from on Push Board (offline
   *  centres with several batches). Absent ⇒ no Batch field. Mirrors server
   *  `utils/campusBatches.ts` — keep the two in sync. */
  campusId?: string
}

export const CAMPUSES: CampusConfig[] = [
  { campusName: 'Kottakkal Boys',            username: 'doparesidentialkottakkalboys@gmail.com', teachers: ['Muhammed Ziyadh K', 'Badaru Dhuja'] },
  { campusName: 'Online Repeat',             username: 'dopaonlineacademics@gmail.com',           teachers: ['Shahana'] },
  { campusName: 'Feroke Girls',              username: 'dopaferokegirlsresidential@gmail.com',    teachers: ['Rafgha Thasneem T', 'Aparna', 'Athira'] },
  { campusName: 'Narikkuni Girls',           username: 'narikkunigirls@gmail.com',                teachers: ['Vidhya', 'Reshma', 'Asna'] },
  { campusName: 'PVT Girls',                 username: 'pvt1aims@gmail.com',                       teachers: ['Athira', 'Akshaya'] },
  { campusName: 'CLT Offline',               username: 'dopacltoffline102@gmail.com',              teachers: ['Ashiq', 'Naja'], campusId: '6a2288d2c59b10a9bd1d5524' },
  { campusName: 'Thrissur Residential',      username: 'dopathrissurresidential@gmail.com',        teachers: ['Reshma', 'Sreeja'] },
  { campusName: 'Calicut Boys',              username: 'dopaaiimsboys@gmail.com',                  teachers: ['Basil', 'Akash'] },
  { campusName: 'Kottakkal Girls',           username: 'chattiparambdopa@gmail.com',               teachers: ['Remya', 'Gopika', 'Nadha'] },
  { campusName: 'Kottakkal Offline',         username: 'kottakkalofflineacademics@gmail.com',      teachers: ['Vijay', 'Sinsina', 'Amrutha'], campusId: '6a2288d2c59b10a9bd1d5525' },
  { campusName: 'Thrissur Offline',          username: 'dopathrissuracc@gmail.com',                teachers: ['Vasannya'], campusId: '6a2288d2c59b10a9bd1d5527' },
  { campusName: 'Kottakkal Offline Tamil',   username: 'dopatamilrepeaters@gmail.com',             teachers: ['Hasna', 'Shilpa'], campusId: '6a2288d2c59b10a9bd1d5526' },
  { campusName: 'Studio',                    username: 'studiodopa5@gmail.com',                    teachers: ['Savin'] },
]

export function findCampusByUsername(username: string): CampusConfig | undefined {
  return CAMPUSES.find((c) => c.username === username.toLowerCase())
}

export function findCampusByName(campusName: string | null | undefined): CampusConfig | undefined {
  return CAMPUSES.find((c) => c.campusName === campusName)
}
