import { Types } from 'mongoose'
import { Batch } from '@/lib/models/Batch'
import { User } from '@/lib/models/User'
import { Session } from '@/lib/models/Session'
import { findIgPushCampus, listActivePushCampuses } from '@/lib/services/pushCampuses'

/** Campus._id → display name for every active IG school. */
export async function getIgCampusNames(): Promise<Map<string, string>> {
  const all = await listActivePushCampuses()
  return new Map(
    all.filter((c) => c.kind === 'IG' && c.batchCampusId).map((c) => [String(c.batchCampusId), c.name]),
  )
}

/** Every campus/school name that is expected to submit daily entries. */
export async function getTrackedCampusNames(): Promise<string[]> {
  return (await listActivePushCampuses()).map((c) => c.name)
}

/** The campus name a coordinator login belongs to. IG class teacher: looked up from
 *  their school's campus record. Class teacher: read from the user's CURRENT record,
 *  not the token — a campus rename must not break teachers who are already signed
 *  in (their token still carries the old name until they sign in again). */
export async function resolveCoordinatorCampusName(
  payload: { userId?: string; role: string; campusName?: string; campusId?: string },
): Promise<string | undefined> {
  if (payload.role === 'IG_CLASS_TEACHER') {
    return (await findIgPushCampus(payload.campusId))?.name
  }
  if (payload.userId && Types.ObjectId.isValid(payload.userId)) {
    const user = await User.findById(payload.userId).select('campusName').lean()
    if (user?.campusName) return user.campusName
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
