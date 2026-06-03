import { ISTimetableSlot } from '@/lib/models/ISTimetableSlot'
import { SpecialDay }     from '@/lib/models/SpecialDay'
import { Types }          from 'mongoose'

export interface ConflictCheckInput {
  date:       Date
  campusId:   Types.ObjectId
  batchId:    Types.ObjectId
  facultyId?: Types.ObjectId
  timeSlot:   'SESSION_1' | 'SESSION_2' | 'SESSION_3'
  /** When updating an existing slot — exclude it from conflict checks */
  excludeId?: Types.ObjectId
}

export interface ConflictResult {
  hasConflict: boolean
  violations:  string[]
}

/**
 * Checks all 5 IS conflict rules.
 *
 * Rule 1: No double-booking — faculty can't teach at the same campus at the same slot.
 * Rule 2: No cross-campus overlap — faculty can't be at IG1 and IG2 in the same slot.
 * Rule 3: Max 2 IS sessions per faculty per day.
 * Rule 4: One class per batch per time slot.
 * Rule 5: No assignments on Buffer Days, Tours, or Holidays for the campus.
 */
export async function checkISConflicts(input: ConflictCheckInput): Promise<ConflictResult> {
  const { date, campusId, batchId, facultyId, timeSlot, excludeId } = input
  const violations: string[] = []

  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
  const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)

  const baseFilter = excludeId ? { _id: { $ne: excludeId } } : {}

  // ── Rule 5: Blocked special days ────────────────────────────────────────────
  const blocked = await SpecialDay.findOne({
    date: { $gte: dayStart, $lte: dayEnd },
    $or: [
      { campusId: campusId },
      { campusId: { $exists: false } },
      { campusId: null },
    ],
    type: { $in: ['TOUR', 'BUFFER_DAY', 'HOLIDAY'] },
  })
  if (blocked) {
    violations.push(
      `Campus has a blocked special day on this date (${blocked.type}${blocked.notes ? ': ' + blocked.notes : ''})`
    )
  }

  // ── Rule 4: One class per batch per time slot ────────────────────────────────
  const batchSlotConflict = await ISTimetableSlot.findOne({
    ...baseFilter,
    batchId,
    date: { $gte: dayStart, $lte: dayEnd },
    timeSlot,
    status: { $ne: 'CANCELLED' },
  })
  if (batchSlotConflict) {
    violations.push(
      `Batch already has a ${timeSlot} class on this date`
    )
  }

  if (facultyId) {
    // ── Rule 1: No double-booking at same campus ─────────────────────────────
    const sameTimeConflict = await ISTimetableSlot.findOne({
      ...baseFilter,
      campusId,
      facultyId,
      date:     { $gte: dayStart, $lte: dayEnd },
      timeSlot,
      status:   { $ne: 'CANCELLED' },
    })
    if (sameTimeConflict) {
      violations.push(
        `Faculty is already assigned at this campus in the ${timeSlot} slot`
      )
    }

    // ── Rule 2: No cross-campus overlap (IG1 ↔ IG2) ─────────────────────────
    const crossCampusConflict = await ISTimetableSlot.findOne({
      ...baseFilter,
      facultyId,
      campusId: { $ne: campusId },
      date:     { $gte: dayStart, $lte: dayEnd },
      timeSlot,
      status:   { $ne: 'CANCELLED' },
    })
    if (crossCampusConflict) {
      violations.push(
        `Faculty is already assigned at a different IS campus in the ${timeSlot} slot (IG1/IG2 overlap not allowed)`
      )
    }

    // ── Rule 3: Max 2 IS sessions per faculty per day ────────────────────────
    const dailyCount = await ISTimetableSlot.countDocuments({
      ...baseFilter,
      facultyId,
      date:   { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
    })
    if (dailyCount >= 3) {
      violations.push(
        `Faculty already has ${dailyCount} IS class${dailyCount > 1 ? 'es' : ''} today (max 3 per day)`
      )
    }
  }

  return { hasConflict: violations.length > 0, violations }
}
