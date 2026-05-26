import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { ISTimetableSlot } from '../models/ISTimetableSlot'
import { asyncHandler } from '../utils/asyncHandler'
import { Types } from 'mongoose'

export const getTimetable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { campusId, batchId } = req.query
  const filter: Record<string, unknown> = { isActive: true }

  if (campusId) {
    try { filter.campusId = new Types.ObjectId(campusId as string) } catch {}
  }
  if (batchId) {
    try { filter.batchId = new Types.ObjectId(batchId as string) } catch {}
  }

  const slots = await ISTimetableSlot.find(filter)
    .populate('facultyId', 'name subject')
    .sort({ dayOfWeek: 1, startTime: 1 })
  res.json(slots)
})

export const upsertTimetableSlot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId, campusId, facultyId, dayOfWeek, subject, startTime, endTime } = req.body

  if (!batchId || dayOfWeek === undefined || !subject || !startTime || !endTime) {
    res.status(400).json({ error: 'batchId, dayOfWeek, subject, startTime, endTime required' })
    return
  }

  let batchOid: Types.ObjectId
  try { batchOid = new Types.ObjectId(batchId) } catch {
    res.status(400).json({ error: 'Invalid batchId' }); return
  }

  const updateData: Record<string, unknown> = { subject, startTime, endTime, isActive: true }
  if (campusId) { try { updateData.campusId = new Types.ObjectId(campusId) } catch {} }
  if (facultyId) { try { updateData.facultyId = new Types.ObjectId(facultyId) } catch {} }
  else { updateData.facultyId = null }  // explicitly clear facultyId if not provided

  const slot = await ISTimetableSlot.findOneAndUpdate(
    { batchId: batchOid, dayOfWeek: Number(dayOfWeek), startTime },
    updateData,
    { upsert: true, new: true }
  )
  res.status(201).json(slot)
})

/**
 * DELETE /integrated-school/timetable/:id
 * Soft-deletes a timetable slot (sets isActive = false).
 * ADMIN and IS_ACADEMICS_MANAGER only.
 */
export const deleteTimetableSlot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const slot = await ISTimetableSlot.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  )
  if (!slot) { res.status(404).json({ error: 'Timetable slot not found' }); return }
  res.json({ success: true })
})
