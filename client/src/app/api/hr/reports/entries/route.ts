import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { NoClassDay } from '@/lib/models/NoClassDay'
import { Batch } from '@/lib/models/Batch'
import { Types } from 'mongoose'
import { getIgCampusNames } from '@/lib/utils/coordinatorCampus'
import { listActivePushCampuses } from '@/lib/services/pushCampuses'
import { dayRangeFilter, parseLocalDate, toLocalISODate } from '@/lib/utils/dateRange'

const MAX_ROWS = 20000
const MAX_DAYS = 93

/**
 * GET /api/hr/reports/entries?from=&to=
 * Everything the Entries report needs in one payload: the campus-logged
 * sessions (with faculty type), the No Class markers, and — per campus — the
 * past days in range where the coordinator submitted nothing at all.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') ?? ''
    const to   = searchParams.get('to') ?? ''
    // The Reports Not Submitted page needs only the missing days, not every entry row.
    const missingOnly = searchParams.get('missingOnly') === '1'
    const range = dayRangeFilter(from, to)
    const fromDate = parseLocalDate(from)
    const toDate = parseLocalDate(to)
    if (!range || !fromDate || !toDate || fromDate > toDate) {
      return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
    }
    if ((toDate.getTime() - fromDate.getTime()) / 86_400_000 > MAX_DAYS) {
      return withToken(json({ error: `Pick a range of at most ${MAX_DAYS} days` }, 400), refreshedToken)
    }

    await connectDB()

    // IG sessions carry a batch rather than a campus name — map batch → school name.
    const igNames = await getIgCampusNames()
    const igBatches = await Batch.find({ type: 'IG', campusId: { $in: Array.from(igNames.keys()).map((id) => new Types.ObjectId(id)) } })
      .select('campusId name').lean()
    const igBatchCampus = new Map(igBatches.map((b) => [String(b._id), igNames.get(String(b.campusId)) as string]))

    const [sessions, noClass] = await Promise.all([
      Session.find({
        status: 'COMPLETED',
        sessionDate: range,
        $or: [
          { campusName: { $exists: true, $nin: [null, ''] } },
          { batchId: { $in: igBatches.map((b) => b._id) } },
        ],
      })
        .select('facultyId campusName batchId extraBatchIds subject chapter classMode sessionDate startTime endTime durationHours breakMinutes lunchBreakMinutes afternoonBreakMinutes updatedByName comment entryType')
        .populate('facultyId', 'name type subject')
        .sort({ sessionDate: 1 })
        .limit(MAX_ROWS)
        .lean(),
      NoClassDay.find({ date: range }).select('campusName date reason').lean(),
    ])

    // Batch names for the Batch column. Keyed by the raw batchId, so a session whose
    // batch was deleted still resolves its campus above and just shows no batch name.
    const batchNames = new Map(igBatches.map((b) => [String(b._id), b.name]))
    const otherBatchIds = Array.from(new Set(
      sessions.flatMap((s) => [s.batchId, ...(s.extraBatchIds ?? [])].filter(Boolean).map(String)),
    )).filter((id) => !batchNames.has(id))
    if (otherBatchIds.length) {
      const docs = await Batch.find({ _id: { $in: otherBatchIds } }).select('name').lean()
      for (const b of docs) batchNames.set(String(b._id), b.name)
    }

    const rows = sessions
      .filter((s) => s.facultyId && typeof s.facultyId === 'object' && (s.campusName || igBatchCampus.has(String(s.batchId))))
      .map((s) => {
        const f = s.facultyId as unknown as { _id: { toString(): string }; name: string; type: string }
        const batchId = s.batchId ? String(s.batchId) : ''
        return {
          _id: String(s._id),
          date: toLocalISODate(new Date(s.sessionDate)),
          campusName: (s.campusName ?? igBatchCampus.get(batchId)) as string,
          facultyId: f._id.toString(),
          facultyName: f.name,
          facultyType: f.type ?? '',
          subject: s.subject,
          chapter: s.chapter ?? '',
          classMode: s.classMode ?? '',
          startTime: s.startTime ?? '',
          endTime: s.endTime ?? '',
          durationHours: s.durationHours,
          entryType: s.entryType ?? null,
          updatedByName: s.updatedByName ?? '',
          comment: s.comment ?? '',
          batchName: [batchId, ...(s.extraBatchIds ?? []).map(String)].map((id) => batchNames.get(id)).filter(Boolean).join(', '),
          breakMinutes: s.breakMinutes ?? null,
          lunchBreakMinutes: s.lunchBreakMinutes ?? null,
          afternoonBreakMinutes: s.afternoonBreakMinutes ?? null,
        }
      })

    const noClassRows = noClass.map((n) => ({
      _id: String(n._id),
      campusName: n.campusName,
      date: toLocalISODate(new Date(n.date)),
      reason: n.reason ?? '',
      batchIds: (n.batchIds ?? []).map(String),
      batchNames: (n.batchIds ?? []).map((b) => batchNames.get(String(b))).filter(Boolean) as string[],
    }))

    // Missing submissions: a past day (before today) where a campus has nothing recorded.
    // A campus that runs several batches must account for EVERY batch (an entry that
    // covers it, or a No Class marker for it); other campuses need just one entry or
    // marker. Today is excluded — the day is still in progress.
    const today = toLocalISODate(new Date())
    const days: string[] = []
    for (const d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const iso = toLocalISODate(d)
      if (iso < today) days.push(iso)
    }

    const pushCampuses = await listActivePushCampuses()
    const campuses = pushCampuses.map((c) => c.name)
    const batchCampusIds = pushCampuses.filter((c) => c.batchCampusId).map((c) => c.batchCampusId as Types.ObjectId)
    const activeBatches = batchCampusIds.length
      ? await Batch.find({ campusId: { $in: batchCampusIds }, isActive: true }).select('campusId name').lean()
      : []
    for (const b of activeBatches) batchNames.set(String(b._id), b.name)
    const batchesOf = new Map<string, { _id: string; name: string }[]>()    // campus name -> its batches
    for (const c of pushCampuses) {
      if (!c.batchCampusId) continue
      const list = activeBatches.filter((b) => String(b.campusId) === String(c.batchCampusId)).map((b) => ({ _id: String(b._id), name: b.name }))
      if (list.length) batchesOf.set(c.name, list)
    }

    for (const n of noClassRows) n.batchNames = n.batchIds.map((id) => batchNames.get(id)).filter(Boolean) as string[]

    const campusCovered = new Set<string>()     // campus|date — any entry or marker that day
    const wholeCovered = new Set<string>()      // campus|date — covers every batch (whole-campus marker, or an entry with no batch)
    const batchCovered = new Set<string>()      // campus|batchId|date
    for (const s of sessions) {
      const campus = (s.campusName ?? igBatchCampus.get(s.batchId ? String(s.batchId) : '')) as string | undefined
      if (!campus) continue
      const date = toLocalISODate(new Date(s.sessionDate))
      const ids = [s.batchId, ...(s.extraBatchIds ?? [])].filter(Boolean).map(String)
      campusCovered.add(`${campus}|${date}`)
      if (ids.length === 0) wholeCovered.add(`${campus}|${date}`)
      for (const id of ids) batchCovered.add(`${campus}|${id}|${date}`)
    }
    for (const n of noClass) {
      const date = toLocalISODate(new Date(n.date))
      campusCovered.add(`${n.campusName}|${date}`)
      if (!n.batchIds?.length) wholeCovered.add(`${n.campusName}|${date}`)
      else for (const b of n.batchIds) batchCovered.add(`${n.campusName}|${String(b)}|${date}`)
    }

    const missing: { campusName: string; batchName?: string; dates: string[] }[] = []
    for (const name of campuses) {
      const batches = batchesOf.get(name)
      if (!batches) {
        const dates = days.filter((d) => !campusCovered.has(`${name}|${d}`))
        if (dates.length) missing.push({ campusName: name, dates })
        continue
      }
      for (const b of batches) {
        const dates = days.filter((d) => !wholeCovered.has(`${name}|${d}`) && !batchCovered.has(`${name}|${b._id}|${d}`))
        if (dates.length) missing.push({ campusName: name, batchName: b.name, dates })
      }
    }

    return withToken(json({
      from, to,
      campuses,
      sessions: missingOnly ? [] : rows,
      noClass: noClassRows,
      missing,
      truncated: sessions.length >= MAX_ROWS,
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/reports/entries]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
