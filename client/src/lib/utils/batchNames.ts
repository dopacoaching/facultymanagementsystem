import { Batch } from '@/lib/models/Batch'

interface WithBatches { batchId?: unknown; extraBatchIds?: unknown[] }
type Plain<T> = T extends { toObject: () => infer O } ? O : T

/** id -> batch name for the given batch ids (unknown ids are simply absent). */
export async function batchNameMap(ids: Iterable<unknown>): Promise<Map<string, string>> {
  const unique = Array.from(new Set(Array.from(ids, String)))
  const names = new Map<string, string>()
  if (unique.length) {
    for (const b of await Batch.find({ _id: { $in: unique } }).select('name').lean()) names.set(String(b._id), b.name)
  }
  return names
}

/** Adds `batchNames` (primary batch first, then any extra batches that sat the same
 *  class) to each session, so history tables can show which batch it was for.
 *  Accepts Mongoose documents or plain/lean objects; returns plain objects. */
export async function attachBatchNames<T extends WithBatches | { toObject: () => WithBatches }>(
  sessions: T[],
): Promise<(Plain<T> & { batchNames: string[] })[]> {
  const objs = sessions.map((s) => (typeof (s as { toObject?: unknown }).toObject === 'function'
    ? (s as { toObject: () => WithBatches }).toObject()
    : s) as WithBatches & Plain<T>)
  const idsOf = (o: WithBatches) => [o.batchId, ...(o.extraBatchIds ?? [])].filter(Boolean)
  const names = await batchNameMap(objs.flatMap(idsOf))
  return objs.map((o) => ({
    ...o,
    batchNames: idsOf(o).map((id) => names.get(String(id))).filter((n): n is string => !!n),
  }))
}
