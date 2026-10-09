import { Types } from 'mongoose'
import { Campus } from '@/lib/models/Campus'
import { Batch } from '@/lib/models/Batch'
import { Session } from '@/lib/models/Session'
import { CAMPUSES } from '@/lib/constants/campuses'
import { IG_TEACHERS } from '@/lib/constants/igTeachers'

/** Campus._id → display name for every IG school that has a login. */
export async function getIgCampusNames(): Promise<Map<string, string>> {
  const docs = await Campus.find({ _id: { $in: Object.keys(IG_TEACHERS) } }).select('name').lean()
  return new Map(docs.map((c) => [String(c._id), c.name]))
}

/** Every campus/school name that is expected to submit daily entries. */
export async function getTrackedCampusNames(): Promise<string[]> {
  const ig = await getIgCampusNames()
  return [...CAMPUSES.map((c) => c.campusName), ...Array.from(ig.values())]
}

/** The campus name a coordinator login belongs to (class teacher: from the token;
 *  IG class teacher: looked up from their school's Campus document). */
export async function resolveCoordinatorCampusName(
  payload: { role: string; campusName?: string; campusId?: string },
): Promise<string | undefined> {
  if (payload.role === 'IG_CLASS_TEACHER') {
    if (!payload.campusId || !Types.ObjectId.isValid(payload.campusId)) return undefined
    return (await getIgCampusNames()).get(payload.campusId)
  }
  return payload.campusName
}

/** Non-cancelled sessions already logged for a campus on a day — campus-flow
 *  rows carry campusName; IG rows are matched through their batch's school. */
export async function countCampusSessionsOnDay(campusName: string, dayStart: Date, dayEnd: Date): Promise<number> {
  const base = { sessionDate: { $gte: dayStart, $lte: dayEnd }, status: { $ne: 'CANCELLED' as const } }
  const direct = await Session.countDocuments({ ...base, campusName })

  const igId = Array.from((await getIgCampusNames()).entries()).find(([, n]) => n === campusName)?.[0]
  if (!igId) return direct
  const batchIds = await Batch.find({ type: 'IG', campusId: new Types.ObjectId(igId) }).distinct('_id')
  return direct + await Session.countDocuments({ ...base, batchId: { $in: batchIds } })
}
