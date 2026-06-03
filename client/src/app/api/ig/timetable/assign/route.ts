import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { ISTimetableSlot } from '@/lib/models/ISTimetableSlot'
import { ISBatchChapter } from '@/lib/models/ISBatchChapter'
import { checkISConflicts } from '@/lib/services/integratedSchool/conflictChecker'

function midnight(d: string | Date): Date {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

/** POST /api/ig/timetable/assign */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IG_ACADEMICS_MANAGER', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { date, campusId, batchId, facultyId, subject, chapter, timeSlot, durationHours, startTime, notes, isUnplanned } = await req.json()

    if (!date || !campusId || !batchId || !subject || !chapter || !timeSlot) {
      return withToken(json({
        error: 'date, campusId, batchId, subject, chapter, timeSlot are required',
      }, 400), refreshedToken)
    }
    if (!['MORNING', 'AFTERNOON'].includes(timeSlot)) {
      return withToken(json({ error: 'timeSlot must be MORNING or AFTERNOON' }, 400), refreshedToken)
    }

    let campusOid: Types.ObjectId, batchOid: Types.ObjectId
    try { campusOid = new Types.ObjectId(campusId) } catch {
      return withToken(json({ error: 'Invalid campusId' }, 400), refreshedToken)
    }
    try { batchOid = new Types.ObjectId(batchId) } catch {
      return withToken(json({ error: 'Invalid batchId' }, 400), refreshedToken)
    }
    let facultyOid: Types.ObjectId | undefined
    if (facultyId) {
      try { facultyOid = new Types.ObjectId(facultyId) } catch {
        return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
      }
    }

    const slotDate = midnight(date)

    await connectDB()

    // Run conflict checks
    const { hasConflict, violations } = await checkISConflicts({
      date:      slotDate,
      campusId:  campusOid,
      batchId:   batchOid,
      facultyId: facultyOid,
      timeSlot,
    })
    if (hasConflict) {
      return withToken(json({ error: 'Scheduling conflict detected', violations }, 409), refreshedToken)
    }

    const slot = await ISTimetableSlot.create({
      date:          slotDate,
      campusId:      campusOid,
      batchId:       batchOid,
      facultyId:     facultyOid,
      subject,
      chapter,
      startTime:     startTime    ?? undefined,
      timeSlot,
      durationHours: durationHours ? Number(durationHours) : undefined,
      notes:         notes        ?? undefined,
      isUnplanned:   Boolean(isUnplanned),
    })

    // Auto-mark the ISBatchChapter as SCHEDULED
    await ISBatchChapter.findOneAndUpdate(
      { batchId: batchOid, chapterName: chapter, subject },
      {
        $set: {
          status:          'SCHEDULED',
          scheduledDate:   slotDate,
          timetableSlotId: slot._id,
        },
      },
      { upsert: false }
    )

    const populated = await slot.populate([
      { path: 'batchId',   select: 'name type ig1Subgroup' },
      { path: 'facultyId', select: 'name subject' },
      { path: 'campusId',  select: 'name location' },
    ])

    return withToken(json(populated, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/ig/timetable/assign]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
