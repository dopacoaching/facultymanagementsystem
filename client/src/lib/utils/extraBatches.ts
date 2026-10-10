import { Types } from 'mongoose'
import { Batch, IBatch } from '@/lib/models/Batch'

/**
 * Multi-batch classes: the teacher may select several batches that sat the same
 * class together. The first is the session's primary batchId; the rest are
 * stored as extraBatchIds. Every extra batch must exist and belong to the same
 * campus as the primary (which the caller has already authorised). Duplicated
 * in server/src/utils/extraBatches.ts and client/src/lib/utils/extraBatches.ts
 * - keep identical.
 */
export async function resolveExtraBatches(
  batchIds: unknown,
  primary: IBatch,
  opts: { igOnly?: boolean } = {},
): Promise<{ ok: true; extras: Types.ObjectId[] } | { ok: false; status: number; error: string }> {
  if (!Array.isArray(batchIds)) return { ok: true, extras: [] }

  const extras: Types.ObjectId[] = []
  for (const raw of batchIds) {
    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(String(raw)) } catch {
      return { ok: false, status: 400, error: 'Invalid batchId in batchIds' }
    }
    if (oid.equals(primary._id as Types.ObjectId)) continue
    if (extras.some((e) => e.equals(oid))) continue
    extras.push(oid)
  }
  if (extras.length === 0) return { ok: true, extras }
  if (extras.length > 20) return { ok: false, status: 400, error: 'Too many batches selected' }

  const found = await Batch.find({ _id: { $in: extras } }).select('campusId type').lean()
  if (found.length !== extras.length) return { ok: false, status: 404, error: 'Batch not found' }
  for (const b of found) {
    if (b.campusId.toString() !== primary.campusId.toString()) {
      return { ok: false, status: 403, error: 'All selected batches must belong to the same campus.' }
    }
    if (opts.igOnly && b.type !== 'IG') {
      return { ok: false, status: 400, error: 'Sessions can only be logged against IG batches on this endpoint' }
    }
  }
  return { ok: true, extras }
}
