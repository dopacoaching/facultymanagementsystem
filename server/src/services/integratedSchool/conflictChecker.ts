import { ISTimetableSlot } from '../../models/ISTimetableSlot'
import { SpecialDay }     from '../../models/SpecialDay'
import { Session }        from '../../models/Session'
import { Batch }          from '../../models/Batch'
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
 * Checks all IS conflict rules.
 *
 * Rule 1: No double-booking — faculty can't teach at the same campus in the same slot.
 * Rule 2: Campus-day lock — all of a faculty's IG sessions on a day must be at the same campus.
 * Rule 3: Max 3 IG sessions per faculty per day.
 * Rule 4: One class per batch per time slot.
 * Rule 5: No assignments on Buffer Days, Tours, or Holidays for the campus.
 * Rule 6: Cross-system lock — if faculty has a Repeaters session that day, IG cannot schedule them.
 */
export async function checkISConflicts(input: ConflictCheckInput): Promise<ConflictResult> {
  const { date, campusId, batchId, facultyId, timeSlot, excludeId } = input
  const violations: string[] = []

  // Use UTC calendar boundaries so the window is correct regardless of server timezone
  const d = new Date(date)
  const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
  const dayEnd   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))

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

    // ── Rule 2: Campus-day lock — all IG sessions for a faculty on a day must be at the same campus ──
    // (Previously per-slot; now day-level so SESSION_1 in IG1 blocks SESSION_2 in IG2.)
    const differentCampusToday = await ISTimetableSlot.findOne({
      ...baseFilter,
      facultyId,
      campusId: { $ne: campusId },
      date:     { $gte: dayStart, $lte: dayEnd },
      status:   { $ne: 'CANCELLED' },
    })
    if (differentCampusToday) {
      violations.push(
        `Faculty is already scheduled at a different IG campus today. All IG sessions for a faculty must be at the same campus on the same day.`
      )
    }

    // ── Rule 3: Max 3 IG sessions per faculty per day ────────────────────────
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

    // ── Rule 6: Cross-system lock — Repeaters session blocks IG scheduling ───
    // IG batches have type 'IG'; everything else is Repeaters (RESIDENTIAL, OFFLINE, ONLINE).
    const repeatersBatchIds = await Batch.find({ type: { $ne: 'IG' } }).distinct('_id')
    const repeatersConflict = await Session.findOne({
      facultyId,
      batchId: { $in: repeatersBatchIds },
      sessionDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
    })
    if (repeatersConflict) {
      violations.push(
        `Faculty has a Repeaters session on this date and cannot be scheduled in IG on the same day.`
      )
    }
  }

  return { hasConflict: violations.length > 0, violations }
}
