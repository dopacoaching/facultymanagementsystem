/**
 * Class-teacher campus login (User.campusName) → Campus._id whose batches that
 * login may pick on Push Board. Only offline centres with batches are listed.
 * Mirrors `campusId` in client `src/lib/constants/campuses.ts` — keep in sync.
 */
export const CAMPUS_LOGIN_CAMPUS_IDS: Record<string, string> = {
  'CLT Offline':             '6a2288d2c59b10a9bd1d5524', // Calicut Offline Center
  'Kottakkal Offline':       '6a2288d2c59b10a9bd1d5525', // Kottakkal Offline Center
  'Thrissur Offline':        '6a2288d2c59b10a9bd1d5527', // Thrissur Offline Center
  'Kottakkal Offline Tamil': '6a2288d2c59b10a9bd1d5526', // Tamil Nadu Campus
}
