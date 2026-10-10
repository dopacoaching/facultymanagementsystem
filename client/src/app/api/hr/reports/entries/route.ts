import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@/lib/models/Session'
import { NoClassDay } from '@/lib/models/NoClassDay'
import { Batch } from '@/lib/models/Batch'
import { Types } from 'mongoose'
import { getIgCampusNames, getTrackedCampusNames } from '@/lib/utils/coordinatorCampus'
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
        .select('facultyId campusName batchId subject chapter classMode sessionDate startTime endTime durationHours breakMinutes lunchBreakMinutes afternoonBreakMinutes updatedByName')
        .populate('facultyId', 'name type subject')
        .sort({ sessionDate: 1 })
        .limit(MAX_ROWS)
        .lean(),
      NoClassDay.find({ date: range }).select('campusName date reason').lean(),
    ])

    // Batch names for the Batch column. Keyed by the raw batchId, so a session whose
    // batch was deleted still resolves its campus above and just shows no batch name.
    const batchNames = new Map(igBatches.map((b) => [String(b._id), b.name]))
    const otherBatchIds = Array.from(new Set(sessions.filter((s) => s.batchId).map((s) => String(s.batchId))))
      .filter((id) => !batchNames.has(id))
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
          updatedByName: s.updatedByName ?? '',
          batchName: batchNames.get(batchId) ?? '',
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
    }))

    // Missing submissions: a past day (before today) with neither a session nor
    // a No Class marker, per configured campus. Today is excluded — the day is
    // still in progress.
    const covered = new Set<string>()
    for (const r of rows) covered.add(`${r.campusName}|${r.date}`)
    for (const n of noClassRows) covered.add(`${n.campusName}|${n.date}`)

    const today = toLocalISODate(new Date())
    const days: string[] = []
    for (const d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const iso = toLocalISODate(d)
      if (iso < today) days.push(iso)
    }
    const campuses = await getTrackedCampusNames()
    const missing = campuses
      .map((name) => ({ campusName: name, dates: days.filter((d) => !covered.has(`${name}|${d}`)) }))
      .filter((m) => m.dates.length > 0)

    return withToken(json({
      from, to,
      campuses,
      sessions: rows,
      noClass: noClassRows,
      missing,
      truncated: sessions.length >= MAX_ROWS,
    }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/reports/entries]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
