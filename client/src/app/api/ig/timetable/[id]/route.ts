import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { ISTimetableSlot } from '@/lib/models/ISTimetableSlot'
import { ISBatchChapter } from '@/lib/models/ISBatchChapter'
import { checkISConflicts } from '@/lib/services/integratedSchool/conflictChecker'

/** PATCH /api/ig/timetable/:id */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IG_ACADEMICS_MANAGER', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params
    const { status, facultyId, notes, chapter, subject, startTime, durationHours } = await req.json()

    await connectDB()

    const slot = await ISTimetableSlot.findById(id)
    if (!slot) return withToken(json({ error: 'Timetable slot not found' }, 404), refreshedToken)
    if (slot.status === 'CANCELLED') {
      return withToken(json({ error: 'Cannot update a cancelled slot' }, 409), refreshedToken)
    }

    const update: Record<string, unknown> = {}

    if (status !== undefined) {
      const allowed = ['PLANNED', 'COMPLETED', 'CANCELLED']
      if (!allowed.includes(status)) {
        return withToken(json({ error: `status must be one of: ${allowed.join(', ')}` }, 400), refreshedToken)
      }
      update.status = status
    }
    if (notes         !== undefined) update.notes         = notes
    if (chapter       !== undefined) update.chapter       = chapter
    if (subject       !== undefined) update.subject       = subject
    if (startTime     !== undefined) update.startTime     = startTime
    if (durationHours !== undefined) update.durationHours = durationHours ? Number(durationHours) : undefined

    // Updating facultyId requires re-running conflict check
    if (facultyId !== undefined) {
      let newFacultyOid: Types.ObjectId | null = null
      if (facultyId) {
        try { newFacultyOid = new Types.ObjectId(facultyId) } catch {
          return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
        }
        const { hasConflict, violations } = await checkISConflicts({
          date:      slot.date,
          campusId:  slot.campusId,
          batchId:   slot.batchId,
          facultyId: newFacultyOid,
          timeSlot:  slot.timeSlot,
          excludeId: slot._id as Types.ObjectId,
        })
        if (hasConflict) {
          return withToken(json({ error: 'Scheduling conflict detected', violations }, 409), refreshedToken)
        }
      }
      update.facultyId = newFacultyOid
    }

    if (Object.keys(update).length === 0) {
      return withToken(json({ error: 'Nothing to update' }, 400), refreshedToken)
    }

    const updated = await ISTimetableSlot.findByIdAndUpdate(id, update, { new: true })
      .populate('batchId',   'name type ig1Subgroup')
      .populate('facultyId', 'name subject')
      .populate('campusId',  'name location')

    const effectiveChapter = (update.chapter as string) ?? slot.chapter
    const effectiveSubject = (update.subject as string) ?? slot.subject

    // Sync ISBatchChapter if chapter/subject renamed without a status change
    if (update.status === undefined && (update.chapter !== undefined || update.subject !== undefined)) {
      await ISBatchChapter.findOneAndUpdate(
        { batchId: slot.batchId, chapterName: slot.chapter, subject: slot.subject },
        {
          $set: {
            ...(update.chapter !== undefined ? { chapterName: update.chapter as string } : {}),
            ...(update.subject !== undefined ? { subject:     update.subject as string } : {}),
          },
        },
        { upsert: false },
      )
    }

    if (update.status === 'COMPLETED') {
      await ISBatchChapter.findOneAndUpdate(
        { batchId: slot.batchId, chapterName: effectiveChapter, subject: effectiveSubject },
        {
          $set: {
            status:          'COMPLETED',
            completedDate:   new Date(),
            timetableSlotId: slot._id,
          },
        },
        { upsert: false }
      )
    }
    if (update.status === 'CANCELLED') {
      await ISBatchChapter.findOneAndUpdate(
        { batchId: slot.batchId, chapterName: effectiveChapter, subject: effectiveSubject },
        {
          $set:   { status: 'CANCELLED' },
          $unset: { scheduledDate: 1, timetableSlotId: 1 },
        },
        { upsert: false }
      )
    }

    return withToken(json(updated), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/ig/timetable/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/ig/timetable/:id — hard delete PLANNED slot */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IG_ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params

    await connectDB()

    const slot = await ISTimetableSlot.findById(id)
    if (!slot) return withToken(json({ error: 'Timetable slot not found' }, 404), refreshedToken)

    if (slot.status !== 'PLANNED') {
      return withToken(json({
        error: 'Only PLANNED slots can be deleted. Cancel completed/cancelled slots instead.',
      }, 409), refreshedToken)
    }

    await Promise.all([
      slot.deleteOne(),
      ISBatchChapter.findOneAndUpdate(
        { batchId: slot.batchId, chapterName: slot.chapter, subject: slot.subject, timetableSlotId: slot._id },
        {
          $set:   { status: 'NOT_YET_SCHEDULED' },
          $unset: { scheduledDate: 1, timetableSlotId: 1 },
        }
      ),
    ])

    return withToken(json({ success: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/ig/timetable/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
