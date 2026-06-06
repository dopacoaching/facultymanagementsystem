import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { FacultyAvailability, AvailabilityStatus } from '../models/FacultyAvailability'
import { Faculty } from '../models/Faculty'
import { asyncHandler } from '../utils/asyncHandler'
import { validateObjectId } from '../utils/objectId'
import { Types } from 'mongoose'

/**
 * GET /academics/availability?facultyId=X&month=M&year=Y
 * Returns all availability entries for a single faculty for the given month.
 */
export const getAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId, month, year } = req.query as Record<string, string | undefined>

  if (!facultyId || !month || !year) {
    res.status(400).json({ error: 'facultyId, month, year required' }); return
  }

  const fid = validateObjectId(facultyId, 'facultyId', res)
  if (!fid) return

  const startDate = new Date(Number(year), Number(month) - 1, 1)
  const endDate   = new Date(Number(year), Number(month),     1)

  const entries = await FacultyAvailability.find({
    facultyId: fid,
    date: { $gte: startDate, $lt: endDate },
  }).sort({ date: 1 })

  res.json(entries)
})

/**
 * GET /academics/availability/all?month=M&year=Y
 * Returns all faculty with their availability entries for the month.
 * Only includes faculty who have at least one entry.
 */
export const getAllAvailabilityForMonth = asyncHandler(async (req: AuthRequest, res: Response) => {
  const month = Number(req.query.month ?? new Date().getMonth() + 1)
  const year  = Number(req.query.year  ?? new Date().getFullYear())

  const startDate = new Date(year, month - 1, 1)
  const endDate   = new Date(year, month,     1)

  const [entries, faculty] = await Promise.all([
    FacultyAvailability.find({ date: { $gte: startDate, $lt: endDate } })
      .sort({ facultyId: 1, date: 1 })
      .lean(),
    Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
  ])

  const facultyMap = new Map(faculty.map((f) => [f._id.toString(), f]))

  // Group by facultyId
  const grouped = new Map<string, { facultyId: unknown; name: string; subject: string; entries: typeof entries }>()
  for (const entry of entries) {
    const fid = entry.facultyId.toString()
    const f   = facultyMap.get(fid)
    if (!f) continue
    if (!grouped.has(fid)) {
      grouped.set(fid, { facultyId: f._id, name: f.name, subject: f.subject, entries: [] })
    }
    grouped.get(fid)!.entries.push(entry)
  }

  res.json({ month, year, faculty: Array.from(grouped.values()) })
})

/**
 * POST /academics/availability
 * Body: { facultyId, dates: string[] }  (ISO date strings, e.g. "2025-06-10")
 * Upserts available-date entries for a faculty. Already-existing dates are skipped.
 */
export const addAvailabilityDates = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { facultyId, dates } = req.body as { facultyId?: string; dates?: string[] }

  if (!facultyId || !dates || !Array.isArray(dates) || dates.length === 0) {
    res.status(400).json({ error: 'facultyId and dates[] required' }); return
  }

  const fid = validateObjectId(facultyId, 'facultyId', res)
  if (!fid) return

  const faculty = await Faculty.findById(fid)
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }

  const userId = new Types.ObjectId(req.user!.userId)

  // Upsert: insert new dates, silently skip duplicates
  const ops = dates.map((dateStr) => ({
    updateOne: {
      filter: { facultyId: fid, date: new Date(dateStr) },
      update: {
        $setOnInsert: {
          facultyId: fid,
          date: new Date(dateStr),
          status: 'AVAILABLE' as AvailabilityStatus,
          loggedByUserId: userId,
        },
      },
      upsert: true,
    },
  }))

  await FacultyAvailability.bulkWrite(ops)

  // Return updated entries for the same month as the first date
  const anchor    = new Date(dates[0])
  const startDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const endDate   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)

  const entries = await FacultyAvailability.find({
    facultyId: fid,
    date: { $gte: startDate, $lt: endDate },
  }).sort({ date: 1 })

  res.json(entries)
})

/**
 * PATCH /academics/availability/:id
 * Body: { status: 'AVAILABLE' | 'RESCHEDULED' | 'CANCELLED', remark?: string }
 * Used when a faculty wants to reschedule or cancel a date they previously offered.
 * The remark (e.g. "Emergency leave" or "Moved to 18th") is preserved in the record.
 */
export const updateAvailabilityEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const oid = validateObjectId(req.params.id, 'id', res)
  if (!oid) return

  const { status, remark } = req.body as { status?: string; remark?: string }

  const VALID = ['AVAILABLE', 'RESCHEDULED', 'CANCELLED']
  if (!status || !VALID.includes(status)) {
    res.status(400).json({ error: 'status must be AVAILABLE, RESCHEDULED, or CANCELLED' }); return
  }

  if (status !== 'AVAILABLE' && !remark?.trim()) {
    res.status(400).json({ error: 'A remark is required when status is RESCHEDULED or CANCELLED' }); return
  }

  const update: Record<string, unknown> = { status }
  if (remark !== undefined) update.remark = remark

  const entry = await FacultyAvailability.findByIdAndUpdate(oid, update, { new: true, runValidators: true })
  if (!entry) { res.status(404).json({ error: 'Entry not found' }); return }

  res.json(entry)
})

/**
 * DELETE /academics/availability/:id
 * Removes an availability entry entirely.
 */
export const deleteAvailabilityEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const oid = validateObjectId(req.params.id, 'id', res)
  if (!oid) return

  const entry = await FacultyAvailability.findByIdAndDelete(oid)
  if (!entry) { res.status(404).json({ error: 'Entry not found' }); return }

  res.json({ success: true })
})
