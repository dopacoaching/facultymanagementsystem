import { Types } from 'mongoose'
import { NoClassDay } from '@/lib/models/NoClassDay'
import { Batch } from '@/lib/models/Batch'

/**
 * A real entry supersedes "No Class" for the batches it covers on that day.
 *
 *  - A whole-campus marker (no batchIds) at a campus WITH batches is narrowed to the
 *    batches that still have no entry; at a campus without batches it is removed.
 *  - A batch-level marker only loses the batches that now have an entry, and is
 *    removed once none are left.
 *
 * `campusBatchCampusId` is the Campus whose batches the campus runs (if any).
 */
export async function supersedeNoClass(
  campusName: string,
  dayStart: Date,
  enteredBatchIds: Types.ObjectId[],
  campusBatchCampusId?: Types.ObjectId | null,
): Promise<void> {
  const markers = await NoClassDay.find({ campusName, date: dayStart })
  for (const m of markers) {
    const covered = (m.batchIds ?? []).map(String)
    const entered = new Set(enteredBatchIds.map(String))

    if (covered.length === 0) {
      // Whole-campus marker.
      if (!campusBatchCampusId || entered.size === 0) { await m.deleteOne(); continue }
      const all = await Batch.find({ campusId: campusBatchCampusId, isActive: true }).distinct('_id')
      const rest = all.filter((id) => !entered.has(String(id)))
      if (rest.length === all.length) continue           // entry was for a batch outside this campus
      if (rest.length === 0) { await m.deleteOne(); continue }
      m.batchIds = rest as Types.ObjectId[]
      await m.save()
      continue
    }

    const remaining = covered.filter((id) => !entered.has(id))
    if (remaining.length === covered.length) continue
    if (remaining.length === 0) { await m.deleteOne(); continue }
    m.batchIds = remaining.map((id) => new Types.ObjectId(id))
    await m.save()
  }
}
