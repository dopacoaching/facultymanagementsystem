import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Session } from '@server/models/Session'
import { Batch, IBatch } from '@server/models/Batch'
import { BatchChapter } from '@server/models/BatchChapter'
import { PermanentFacultyContract } from '@server/models/PermanentFacultyContract'
import { writeAuditLog } from '@server/services/salary/audit'
import { isVideoFirstBatch } from '@server/utils/batchUtils'

function isCoordinator(role: string): boolean {
  return role === 'COORDINATOR' || role === 'IS_COORDINATOR'
}

/** GET /api/integrated-school/sessions — scoped to IS batches only */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { searchParams } = new URL(req.url)
    let facultyId    = searchParams.get('facultyId') ?? undefined
    const batchId    = searchParams.get('batchId')   ?? undefined
    const month      = searchParams.get('month')     ?? undefined
    const year       = searchParams.get('year')      ?? undefined
    const limitParam = searchParams.get('limit')     ?? undefined

    const filter: Record<string, unknown> = {}

    // FACULTY scope guard
    if (payload.role === 'FACULTY') {
      const theirFacultyId = payload.facultyId
      if (!theirFacultyId) {
        return withToken(json({ error: 'Faculty account not linked to a faculty profile' }, 403), refreshedToken)
      }
      facultyId = theirFacultyId
    }

    await connectDB()

    if (facultyId) {
      try { filter.facultyId = new Types.ObjectId(facultyId) } catch {
        return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
      }
    }

    if (batchId) {
      try { filter.batchId = new Types.ObjectId(batchId) } catch {
        return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
      }
    } else {
      // Scope to IS batches only
      const isIds = await Batch.find({ type: 'INTEGRATED_SCHOOL', isActive: true }).distinct('_id')
      filter.batchId = { $in: isIds }
    }

    if (month && year) {
      filter.sessionDate = {
        $gte: new Date(Number(year), Number(month) - 1, 1),
        $lt:  new Date(Number(year), Number(month), 1),
      }
    }

    const maxLimit = 500
    const requestedLimit = limitParam ? Math.min(Number(limitParam), maxLimit) : maxLimit

    const sessions = await Session.find(filter)
      .populate('facultyId', 'name subject')
      .sort({ sessionDate: -1 })
      .limit(requestedLimit)

    return withToken(json(sessions), refreshedToken)
  } catch (err) {
    console.error('[GET /api/integrated-school/sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/integrated-school/sessions */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IS_COORDINATOR', 'IS_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { facultyId, batchId, subject, chapter, durationHours, sessionDate, timeSlot } = await req.json()

    if (!facultyId || !batchId || !subject || !chapter || !durationHours || !sessionDate) {
      return withToken(json({
        error: 'All fields are required: facultyId, batchId, subject, chapter, durationHours, sessionDate',
      }, 400), refreshedToken)
    }

    let facultyOid: Types.ObjectId, batchOid: Types.ObjectId
    try { facultyOid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }
    try { batchOid = new Types.ObjectId(batchId) } catch {
      return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
    }

    const date = new Date(sessionDate)
    if (isNaN(date.getTime())) {
      return withToken(json({ error: 'Invalid sessionDate' }, 400), refreshedToken)
    }
    date.setHours(0, 0, 0, 0)

    const dayStart = new Date(date)
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    await connectDB()

    const batch = await Batch.findById(batchOid)
    if (!batch) return withToken(json({ error: 'Batch not found' }, 404), refreshedToken)

    // Coordinator batch ownership gate
    if (isCoordinator(payload.role)) {
      if (!payload.batchId || payload.batchId !== batchId) {
        return withToken(json({ error: 'You can only log sessions for your assigned batch.' }, 403), refreshedToken)
      }
    }

    // VIDEO-FIRST GATE (Residential + Online only — IS batches skip this)
    if (isVideoFirstBatch(batch.type)) {
      const chapterRecord = await BatchChapter.findOne({ batchId: batchOid, subject, chapterName: chapter })
      if (!chapterRecord || !chapterRecord.videoComplete) {
        return withToken(json({
          error: `Cannot log faculty class for "${chapter}" — video lessons not yet marked complete for this batch.`,
          code:  'VIDEO_NOT_COMPLETE',
        }, 422), refreshedToken)
      }
    }

    // DUPLICATE SESSION CHECK
    const dup = await Session.findOne({
      facultyId: facultyOid,
      batchId:   batchOid,
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status:    { $ne: 'CANCELLED' },
    })
    if (dup) {
      return withToken(json({
        error: 'Duplicate session: a session is already logged for this faculty in this batch on this date.',
        code:  'DUPLICATE_SESSION',
      }, 409), refreshedToken)
    }

    // OFFLINE 1-CAMPUS LIMIT
    if (batch.type === 'OFFLINE') {
      const todaySessions = await Session.find({
        facultyId:   facultyOid,
        sessionDate: { $gte: dayStart, $lte: dayEnd },
        status:      { $ne: 'CANCELLED' },
      }).populate<{ batchId: IBatch }>('batchId', 'type campusId')

      const offlineOtherCampus = todaySessions.find((s) => {
        const b = s.batchId as unknown as IBatch
        return b.type === 'OFFLINE' && b.campusId.toString() !== batch.campusId.toString()
      })
      if (offlineOtherCampus) {
        return withToken(json({
          error: 'Offline faculty can only be assigned to one campus per day.',
          code:  'OFFLINE_CAMPUS_CONFLICT',
        }, 409), refreshedToken)
      }
    }

    // RESIDENTIAL/ONLINE MAX 2-CAMPUS CHECK
    if (isVideoFirstBatch(batch.type)) {
      const todaySessions = await Session.find({
        facultyId:   facultyOid,
        sessionDate: { $gte: dayStart, $lte: dayEnd },
        status:      { $ne: 'CANCELLED' },
      }).populate<{ batchId: IBatch }>('batchId', 'campusId')

      const campusesToday = new Set(
        todaySessions.map((s) => (s.batchId as unknown as IBatch).campusId.toString())
      )
      if (!campusesToday.has(batch.campusId.toString()) && campusesToday.size >= 2) {
        return withToken(json({
          error: 'Faculty already assigned to 2 campuses today.',
          code:  'MAX_CAMPUS_LIMIT',
        }, 409), refreshedToken)
      }
    }

    const session = await Session.create({
      facultyId:     facultyOid,
      batchId:       batchOid,
      subject,
      chapter,
      durationHours: Number(durationHours),
      sessionDate:   date,
      timeSlot:      timeSlot ?? undefined,
      status:        'SCHEDULED',
      loggedByUserId: new Types.ObjectId(payload.userId),
    })

    // Auto-mark chapter as facultyClassDone
    await BatchChapter.findOneAndUpdate(
      { batchId: batchOid, subject, chapterName: chapter },
      {
        $set: {
          facultyClassDone:   true,
          facultyClassDoneAt: date,
          sessionId:          session._id,
        },
        $setOnInsert: { chapterOrder: 0, videoComplete: false },
      },
      { upsert: true }
    )

    return withToken(json(session, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/integrated-school/sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
