import { Types } from 'mongoose'
import { User } from '@/lib/models/User'
import { Campus } from '@/lib/models/Campus'
import { Batch } from '@/lib/models/Batch'
import { PushCampus, IPushCampus } from '@/lib/models/PushCampus'

type PushCampusLean = Pick<IPushCampus, 'name' | 'kind' | 'batchCampusId'>

/** The shared login account(s) that sign in as this campus. */
export function loginFilter(c: PushCampusLean) {
  return c.kind === 'IG'
    ? { role: 'IG_CLASS_TEACHER' as const, campusId: c.batchCampusId }
    : { role: 'CLASS_TEACHER' as const, campusName: c.name }
}

export async function findLogin(c: PushCampusLean) {
  if (c.kind === 'IG' && !c.batchCampusId) return null
  return User.findOne(loginFilter(c)).select('username isActive')
}

/** Row shape returned to the Campuses screen. */
export async function describeCampus(c: IPushCampus | (Record<string, unknown> & PushCampusLean)) {
  const doc = c as unknown as {
    _id: Types.ObjectId; name: string; kind: 'CAMPUS' | 'IG'; isActive: boolean
    teachers: { name: string; isActive: boolean }[]; batchCampusId?: Types.ObjectId
  }
  const [login, batchCount] = await Promise.all([
    findLogin(doc),
    doc.batchCampusId ? Batch.countDocuments({ campusId: doc.batchCampusId }) : Promise.resolve(0),
  ])
  return {
    _id: String(doc._id),
    name: doc.name,
    kind: doc.kind,
    isActive: doc.isActive,
    teachers: doc.teachers,
    hasBatches: !!doc.batchCampusId,
    batchCampusId: doc.batchCampusId ? String(doc.batchCampusId) : null,
    batchCount,
    login: login ? { _id: String(login._id), username: login.username, isActive: login.isActive } : null,
  }
}

/**
 * The Campus document that owns this campus's batches: reuses an existing one
 * with the same name, otherwise creates it. Refuses (conflict) when an existing
 * Campus of that name already belongs to another Push Board campus.
 */
export async function ensureBatchCampus(
  name: string,
  location?: string,
): Promise<{ _id: Types.ObjectId; created: boolean } | { conflict: string }> {
  const existing = await Campus.findOne({ name })
  if (existing) {
    if (await PushCampus.exists({ batchCampusId: existing._id })) {
      return { conflict: 'A batch campus with this name is already used by another campus — choose a different name.' }
    }
    return { _id: existing._id as Types.ObjectId, created: false }
  }
  const doc = await Campus.create({ name, location: location || undefined })
  return { _id: doc._id as Types.ObjectId, created: true }
}

/** Renames a campus everywhere its name is stored as a string. IG entries are
 *  keyed by batch, not by name, so only No Class days move for IG schools. */
export async function cascadeCampusRename(oldName: string, newName: string, kind: 'CAMPUS' | 'IG'): Promise<void> {
  const { Session } = await import('@/lib/models/Session')
  const { NoClassDay } = await import('@/lib/models/NoClassDay')
  await Promise.all([
    NoClassDay.updateMany({ campusName: oldName }, { $set: { campusName: newName } }),
    kind === 'CAMPUS' ? Session.updateMany({ campusName: oldName }, { $set: { campusName: newName } }) : Promise.resolve(),
    kind === 'CAMPUS' ? User.updateMany({ campusName: oldName }, { $set: { campusName: newName } }) : Promise.resolve(),
  ])
}

export { PushCampus }
