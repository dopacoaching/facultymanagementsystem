import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { NoClassDay } from '@/lib/models/NoClassDay'
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
    return withToken(json(rows), refreshedToken)
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

    const { campusName: bodyCampus, date: dateStr, reason, markedByName } = await req.json()

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
    const existing = await countCampusSessionsOnDay(campusName, date, dayEnd)
    if (existing > 0) {
      return withToken(json({
        error: 'Sessions are already recorded for this campus on that date, so it cannot be marked No Class.',
        code: 'SESSIONS_EXIST',
      }, 409), refreshedToken)
    }

    try {
      const doc = await NoClassDay.create({
        campusName,
        date,
        reason: reason.trim().slice(0, 120),
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

/** DELETE /api/academics/no-class?id= — undo a No Class marker */
export async function DELETE(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const id = new URL(req.url).searchParams.get('id')
    if (!id || !Types.ObjectId.isValid(id)) {
      return withToken(json({ error: 'Invalid id' }, 400), refreshedToken)
    }

    await connectDB()
    const doc = await NoClassDay.findById(id)
    if (!doc) return withToken(json({ error: 'Not found' }, 404), refreshedToken)
    if (isCoordinator(payload.role) && doc.campusName !== await resolveCoordinatorCampusName(payload)) {
      return withToken(json({ error: 'You can only change your own campus.' }, 403), refreshedToken)
    }
    await doc.deleteOne()
    return withToken(json({ ok: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/academics/no-class]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
