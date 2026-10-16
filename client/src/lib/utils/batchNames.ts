import { Batch } from '@/lib/models/Batch'

interface WithBatches { batchId?: unknown; extraBatchIds?: unknown[] }

/** Adds `batchNames` (primary batch first, then any extra batches that sat the same
 *  class) to each session, so history tables can show which batch it was for. */
export async function attachBatchNames<T extends { toObject: () => WithBatches }>(
  sessions: T[],
): Promise<(ReturnType<T['toObject']> & { batchNames: string[] })[]> {
  const objs = sessions.map((s) => s.toObject() as ReturnType<T['toObject']>)
  const ids = new Set<string>()
  for (const o of objs) {
    for (const id of [o.batchId, ...(o.extraBatchIds ?? [])]) if (id) ids.add(String(id))
  }
  const names = new Map<string, string>()
  if (ids.size) {
    const docs = await Batch.find({ _id: { $in: Array.from(ids) } }).select('name').lean()
    for (const b of docs) names.set(String(b._id), b.name)
  }
  return objs.map((o) => ({
    ...o,
    batchNames: [o.batchId, ...(o.extraBatchIds ?? [])]
      .filter(Boolean).map((id) => names.get(String(id))).filter((n): n is string => !!n),
  }))
}
