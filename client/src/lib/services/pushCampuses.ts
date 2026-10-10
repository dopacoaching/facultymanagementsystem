import { Types } from 'mongoose'
import { Campus } from '@/lib/models/Campus'
import { PushCampus, IPushCampus } from '@/lib/models/PushCampus'
import { CAMPUSES } from '@/lib/constants/campuses'
import { IG_TEACHERS } from '@/lib/constants/igTeachers'

let seeded = false

/**
 * First use only: copy the original hard-coded campus list (constants/campuses.ts
 * and constants/igTeachers.ts) into the database. After that the database is the
 * single source of truth and the constants are never read again.
 */
export async function ensurePushCampusesSeeded(): Promise<void> {
  if (seeded) return
  if ((await PushCampus.estimatedDocumentCount()) > 0) { seeded = true; return }

  const docs: Partial<IPushCampus>[] = CAMPUSES.map((c) => ({
    name: c.campusName,
    kind: 'CAMPUS' as const,
    teachers: c.teachers.map((name) => ({ name, isActive: true })),
    batchCampusId: c.campusId ? new Types.ObjectId(c.campusId) : undefined,
    isActive: true,
  }))
  const igCampuses = await Campus.find({ _id: { $in: Object.keys(IG_TEACHERS) } }).select('name').lean()
  for (const c of igCampuses) {
    docs.push({
      name: c.name,
      kind: 'IG',
      teachers: (IG_TEACHERS[String(c._id)] ?? []).map((name) => ({ name, isActive: true })),
      batchCampusId: c._id as Types.ObjectId,
      isActive: true,
    })
  }
  try {
    await PushCampus.insertMany(docs, { ordered: false })
  } catch (e) {
    // A concurrent first request already seeded — duplicate-name errors are fine.
    if ((e as { code?: number }).code !== 11000 && !(e as { writeErrors?: unknown }).writeErrors) throw e
  }
  seeded = true
}

export async function listActivePushCampuses() {
  await ensurePushCampusesSeeded()
  return PushCampus.find({ isActive: true }).sort({ name: 1 }).lean()
}

/** Active campus by the name stored on the login / sessions. */
export async function findPushCampusByName(name: string | null | undefined) {
  if (!name) return null
  await ensurePushCampusesSeeded()
  return PushCampus.findOne({ name, isActive: true }).lean()
}

/** Active IG school by its Campus._id (the IG login's campusId). */
export async function findIgPushCampus(campusId: string | undefined) {
  if (!campusId || !Types.ObjectId.isValid(campusId)) return null
  await ensurePushCampusesSeeded()
  return PushCampus.findOne({ kind: 'IG', batchCampusId: new Types.ObjectId(campusId), isActive: true }).lean()
}

/** Names offered in the teacher dropdowns. */
export function activeTeacherNames(c: { teachers?: { name: string; isActive: boolean }[] } | null): string[] {
  return (c?.teachers ?? []).filter((t) => t.isActive).map((t) => t.name)
}
