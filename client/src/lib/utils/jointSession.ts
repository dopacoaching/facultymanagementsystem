/** One definition of a "joint class": IG joint classes carry jointIG; repeaters joint classes
 *  list two or more campuses in jointCampuses. Joint classes are a separate stream from the Push Board. */
export function isJointSession(s: { jointIG?: boolean | null; jointCampuses?: string[] | null }): boolean {
  return !!s.jointIG || (s.jointCampuses?.length ?? 0) >= 2
}

/** Mongo filter matching Push Board sessions only (the inverse of isJointSession). */
export const NOT_JOINT = { jointIG: { $ne: true }, 'jointCampuses.1': { $exists: false } }

/** Mongo filter matching joint classes of one kind. */
export const jointFilter = (kind: 'IG' | 'REPEATERS') =>
  kind === 'IG' ? { jointIG: true } : { 'jointCampuses.1': { $exists: true } }
