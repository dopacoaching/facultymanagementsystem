import { Session } from '@/lib/models/Session'
import { Batch } from '@/lib/models/Batch'
import { batchNameMap } from '@/lib/utils/batchNames'
import { getIgCampusNames } from '@/lib/utils/coordinatorCampus'
import { dayRangeFilter, toLocalISODate } from '@/lib/utils/dateRange'

export interface JointHistoryRow {
  _id: string
  /** YYYY-MM-DD */
  date: string
  facultyName: string
  subject: string
  chapter: string
  classMode: string
  startTime: string
  endTime: string
  durationHours: number
  /** Every school/campus the class covered. */
  campuses: string[]
  batchNames: string[]
  enteredBy: string
  comment: string
  createdAt: string
}

/** Joint classes in a date range, newest day first. IG joint classes carry the jointIG flag;
 *  repeaters joint classes list their campuses in jointCampuses. */
export async function listJointHistory(kind: 'IG' | 'REPEATERS', from: string | null, to: string | null, limit = 500): Promise<JointHistoryRow[] | null> {
  const filter: Record<string, unknown> = kind === 'IG'
    ? { jointIG: true }
    : { 'jointCampuses.1': { $exists: true } }
  if (from && to) {
    const range = dayRangeFilter(from, to)
    if (!range) return null
    filter.sessionDate = range
  }

  const sessions = await Session.find(filter)
    .populate('facultyId', 'name')
    .sort({ sessionDate: -1, createdAt: -1 })
    .limit(limit)
    .lean()

  const batchIdsOf = (s: { batchId?: unknown; extraBatchIds?: unknown[] }) => [s.batchId, ...(s.extraBatchIds ?? [])].filter(Boolean).map(String)
  const names = await batchNameMap(sessions.flatMap(batchIdsOf))

  // IG schools are found through their batches.
  const batchSchool = new Map<string, string>()
  if (kind === 'IG') {
    const schools = await getIgCampusNames()
    const batches = await Batch.find({ _id: { $in: Array.from(new Set(sessions.flatMap(batchIdsOf))) } }).select('campusId').lean()
    for (const b of batches) {
      const school = schools.get(String(b.campusId))
      if (school) batchSchool.set(String(b._id), school)
    }
  }

  return sessions.map((s) => {
    const f = s.facultyId as unknown as { name?: string } | null
    return {
      _id: String(s._id),
      date: toLocalISODate(new Date(s.sessionDate)),
      facultyName: f?.name ?? '—',
      subject: s.subject,
      chapter: s.chapter ?? '',
      classMode: s.classMode ?? '',
      startTime: s.startTime ?? '',
      endTime: s.endTime ?? '',
      durationHours: s.durationHours,
      campuses: kind === 'IG'
        ? Array.from(new Set(batchIdsOf(s).map((id) => batchSchool.get(id)).filter((n): n is string => !!n)))
        : s.jointCampuses ?? [],
      batchNames: batchIdsOf(s).map((id) => names.get(id)).filter((n): n is string => !!n),
      enteredBy: s.updatedByName ?? '',
      comment: s.comment ?? '',
      createdAt: new Date((s as { createdAt?: Date }).createdAt ?? s.sessionDate).toISOString(),
    }
  })
}
