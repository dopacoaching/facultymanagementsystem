/**
 * Campuses that may share one class on the repeaters Joint Class Entry (one faculty teaching
 * several campuses at the same time). Online Repeat and Studio are deliberately not on it.
 * Matched against the PushCampus name; a campus that is inactive or renamed simply drops out.
 */
export const JOINT_REPEATER_CAMPUSES = [
  'CLT Offline',
  'Calicut Boys',
  'Feroke Girls',
  'Kottakkal Boys',
  'Kottakkal Girls',
  'Kottakkal Offline',
  'Narikkuni Girls',
  'PVT Girls',
  'Thrissur Offline',
  'Thrissur Residential',
] as const

/** Shown as "Entered by" on every repeaters joint entry — the login is held by one person. */
export const JOINT_REPEATER_ENTERED_BY = 'Badardhuja K'
