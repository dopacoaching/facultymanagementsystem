import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { NoClassDay } from '@/lib/models/NoClassDay'
import { Batch } from '@/lib/models/Batch'
import { batchNameMap } from '@/lib/utils/batchNames'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { Session } from '@/lib/models/Session'
import { findPushCampusByName } from '@/lib/services/pushCampuses'
import { countCampusSessionsOnDay, getTrackedCampusNames, resolveCoordinatorCampusName } from '@/lib/utils/coordinatorCampus'
import { dayRangeFilter, parseLocalDate, toLocalISODate } from '@/lib/utils/dateRange'

function isCoordinator(role: string): boolean {
  return role === 'CLASS_TEACHER' || role === 'IG_CLASS_TEACHER'
}

/** GET /api/academics/no-class?from=&to= — coordinators see their own campus, HR/Admin all */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to   = searchParams.get('to')

    const filter: Record<string, unknown> = {}
    await connectDB()
    if (isCoordinator(payload.role)) {
      const own = await resolveCoordinatorCampusName(payload)
      if (!own) return withToken(json({ error: 'Your account is not linked to a campus' }, 403), refreshedToken)
      filter.campusName = own
    }
    if (from && to) {
      const range = dayRangeFilter(from, to)
      if (!range) return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
      filter.date = range
    }

    const rows = await NoClassDay.find(filter).sort({ date: -1 }).limit(500).lean()
    const names = await batchNameMap(rows.flatMap((r) => r.batchIds ?? []))
    return withToken(json(rows.map((r) => ({
      ...r,
      // The calendar day as written by the server, so every browser timezone shows the same date.
      day: toLocalISODate(new Date(r.date)),
      batchNames: (r.batchIds ?? []).map((id) => names.get(String(id))).filter((n): n is string => !!n),
    }))), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/no-class]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/academics/no-class — mark a campus day as "No Class" */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { campusName: bodyCampus, date: dateStr, reason, markedByName, batchIds: rawBatchIds } = await req.json()

    await connectDB()

    // A coordinator can only mark their own campus; HR/Admin must name one.
    const campusName: string | undefined = isCoordinator(payload.role)
      ? await resolveCoordinatorCampusName(payload)
      : bodyCampus
    if (!campusName || !(await getTrackedCampusNames()).includes(campusName)) {
      return withToken(json({ error: 'A valid campusName is required' }, 400), refreshedToken)
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      return withToken(json({ error: 'A reason is required' }, 400), refreshedToken)
    }
    const date = typeof dateStr === 'string' ? parseLocalDate(dateStr) : null
    if (!date) {
      return withToken(json({ error: 'date must be a YYYY-MM-DD date' }, 400), refreshedToken)
    }
    if (dateStr > toLocalISODate(new Date())) {
      return withToken(json({ error: 'You cannot mark a future date as No Class' }, 400), refreshedToken)
    }

    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    // Campuses that run batches may mark only some of them. None ticked = the whole campus.
    let batchOids: Types.ObjectId[] = []
    if (Array.isArray(rawBatchIds) && rawBatchIds.length > 0) {
      const pushCampus = await findPushCampusByName(campusName)
      if (!pushCampus?.batchCampusId) {
        return withToken(json({ error: 'This campus has no batches to choose from.' }, 400), refreshedToken)
      }
      if (!rawBatchIds.every((id) => typeof id === 'string' && Types.ObjectId.isValid(id))) {
        return withToken(json({ error: 'Invalid batchIds' }, 400), refreshedToken)
      }
      const ids = Array.from(new Set(rawBatchIds as string[])).map((id) => new Types.ObjectId(id))
      const valid = await Batch.countDocuments({ _id: { $in: ids }, campusId: pushCampus.batchCampusId, isActive: true })
      if (valid !== ids.length) {
        return withToken(json({ error: 'One or more batches do not belong to this campus.' }, 400), refreshedToken)
      }
      batchOids = ids
    }

    // Overlap with what is already recorded that day.
    const sameDay = await NoClassDay.find({ campusName, date }).select('batchIds').lean()
    const conflict = batchOids.length === 0
      ? sameDay.length > 0
      : sameDay.some((m) => !m.batchIds?.length || m.batchIds.some((b) => batchOids.some((o) => o.equals(b))))
    if (conflict) {
      return withToken(json({
        error: batchOids.length === 0
          ? 'This day already has a No Class marker for this campus. Ask HR to remove it first to mark the whole campus.'
          : 'One or more of these batches is already marked No Class for that date.',
        code: 'ALREADY_MARKED',
      }, 409), refreshedToken)
    }

    const existing = batchOids.length === 0
      ? await countCampusSessionsOnDay(campusName, date, dayEnd)
      : await Session.countDocuments({
          sessionDate: { $gte: date, $lte: dayEnd },
          status: { $ne: 'CANCELLED' },
          $or: [{ batchId: { $in: batchOids } }, { extraBatchIds: { $in: batchOids } }],
        })
    if (existing > 0) {
      return withToken(json({
        error: batchOids.length === 0
          ? 'Sessions are already recorded for this campus on that date, so it cannot be marked No Class.'
          : 'Sessions are already recorded for these batches on that date, so they cannot be marked No Class.',
        code: 'SESSIONS_EXIST',
      }, 409), refreshedToken)
    }

    try {
      const doc = await NoClassDay.create({
        campusName,
        date,
        reason: reason.trim().slice(0, 120),
        batchIds: batchOids.length ? batchOids : undefined,
        markedByUserId: new Types.ObjectId(payload.userId),
        markedByName: typeof markedByName === 'string' && markedByName ? markedByName : undefined,
      })
      return withToken(json(doc, 201), refreshedToken)
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        return withToken(json({ error: 'This date is already marked as No Class for the campus.', code: 'ALREADY_MARKED' }, 409), refreshedToken)
      }
      throw e
    }
  } catch (err) {
    console.error('[POST /api/academics/no-class]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH /api/academics/no-class?id= — HR/Admin edit the reason of a No Class marker */
export async function PATCH(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const id = new URL(req.url).searchParams.get('id')
    if (!id || !Types.ObjectId.isValid(id)) {
      return withToken(json({ error: 'Invalid id' }, 400), refreshedToken)
    }
    const body = await req.json().catch(() => null) as { reason?: unknown } | null
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return withToken(json({ error: 'A reason is required' }, 400), refreshedToken)
    if (reason.length > 120) return withToken(json({ error: 'The reason can be at most 120 characters' }, 400), refreshedToken)

    await connectDB()
    const before = await NoClassDay.findById(id).select('reason')
    const doc = await NoClassDay.findByIdAndUpdate(id, { $set: { reason } }, { returnDocument: 'after' })
    if (!doc) return withToken(json({ error: 'Not found' }, 404), refreshedToken)

    writeAuditLog({
      category: 'ACADEMICS', eventType: 'NO_CLASS_UPDATED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'NoClassDay', targetId: id, targetName: doc.campusName,
      description: `No Class reason changed for ${doc.campusName} on ${toLocalISODate(doc.date)}`,
      metadata: { from: before?.reason, to: reason },
    }).catch(() => null)
    return withToken(json(doc), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/no-class]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/academics/no-class?id= — HR/Admin remove a No Class marker (class teachers cannot undo) */
export async function DELETE(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const id = new URL(req.url).searchParams.get('id')
    if (!id || !Types.ObjectId.isValid(id)) {
      return withToken(json({ error: 'Invalid id' }, 400), refreshedToken)
    }

    await connectDB()
    const doc = await NoClassDay.findById(id)
    if (!doc) return withToken(json({ error: 'Not found' }, 404), refreshedToken)
    await doc.deleteOne()
    writeAuditLog({
      category: 'ACADEMICS', eventType: 'NO_CLASS_DELETED',
      actorUserId: payload.userId, actorRole: payload.role, actorUsername: payload.username,
      targetType: 'NoClassDay', targetId: id, targetName: doc.campusName,
      description: `No Class marker removed for ${doc.campusName} on ${toLocalISODate(doc.date)}`,
      metadata: { reason: doc.reason, batchIds: (doc.batchIds ?? []).map(String), markedByName: doc.markedByName },
    }).catch(() => null)
    return withToken(json({ ok: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/academics/no-class]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
