import { Types } from 'mongoose'
import { chapterNamesOf } from '@/lib/utils/chapters'
import { chapterSubjectOf } from '@/lib/constants/labSubjects'
import { BatchChapter } from '@/lib/models/BatchChapter'
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

  const found = await Batch.find({ _id: { $in: extras } }).select('campusId type isActive').lean()
  if (found.length !== extras.length) return { ok: false, status: 404, error: 'Batch not found' }
  for (const b of found) {
    if (b.campusId.toString() !== primary.campusId.toString()) {
      return { ok: false, status: 403, error: 'All selected batches must belong to the same campus.' }
    }
    if (b.isActive === false) {
      return { ok: false, status: 400, error: 'A selected batch is no longer active.' }
    }
    if (opts.igOnly && b.type !== 'IG') {
      return { ok: false, status: 400, error: 'Sessions can only be logged against IG batches on this endpoint' }
    }
  }
  return { ok: true, extras }
}

/**
 * A class teacher correcting which batches sat a class they pushed. The campus is
 * anchored to the entry's current primary batch (already verified as theirs), so the
 * new selection can only ever contain batches of that same campus. The current primary
 * stays primary when still selected; otherwise the first selected batch takes over.
 */
export async function resolveTeacherBatchEdit(
  batchIds: unknown,
  existingBatchId: unknown,
  opts: { igOnly?: boolean } = {},
): Promise<{ ok: true; batchId: Types.ObjectId; extras: Types.ObjectId[] } | { ok: false; status: number; error: string }> {
  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return { ok: false, status: 400, error: 'Select at least one batch' }
  }
  if (!existingBatchId) return { ok: false, status: 400, error: 'This entry has no batch to change' }
  const anchor = await Batch.findById(existingBatchId)
  if (!anchor) return { ok: false, status: 404, error: 'Batch not found' }

  const r = await resolveExtraBatches(batchIds, anchor, opts)
  if (!r.ok) return r
  const keepsAnchor = batchIds.some((id) => String(id) === String(anchor._id))
  const all = keepsAnchor ? [anchor._id as Types.ObjectId, ...r.extras] : r.extras
  if (all.length === 0) return { ok: false, status: 400, error: 'Select at least one batch' }
  return { ok: true, batchId: all[0], extras: all.slice(1) }
}

/**
 * A teacher changed which batches sat an entry: keep the syllabus "class done" marks in
 * step. Marks on batches no longer in the entry are cleared; the batches now in it are
 * marked (every batch for IG schools, which track chapters per batch; just the primary
 * for campus entries). Chapters are keyed by the theory subject (labs share it).
 */
export async function syncChapterLinks(
  session: { _id: Types.ObjectId; batchId?: Types.ObjectId; extraBatchIds?: Types.ObjectId[]; subject: string; chapter?: string; chapters?: string[]; sessionDate: Date },
  opts: { perBatch: boolean },
) {
  if (!session.batchId) return
  const all = [session.batchId, ...(session.extraBatchIds ?? [])]
  const targets = opts.perBatch ? all : [session.batchId]
  await BatchChapter.updateMany(
    { sessionId: session._id, facultyClassDone: true, batchId: { $nin: targets } },
    { $set: { facultyClassDone: false }, $unset: { facultyClassDoneAt: 1, sessionId: 1 } },
  )
  const subject = chapterSubjectOf(session.subject)
  for (const batchId of targets) {
    for (const chapterName of chapterNamesOf(session)) {
      await BatchChapter.findOneAndUpdate(
        { batchId, subject, chapterName },
        { $set: { facultyClassDone: true, facultyClassDoneAt: session.sessionDate, sessionId: session._id }, $setOnInsert: { chapterOrder: 0, videoComplete: false } },
        { upsert: true },
      )
    }
  }
}

/**
 * HR/Admin choosing the batches of an IG entry from scratch: the first batch becomes the
 * primary and every batch must be an IG batch of one school.
 */
export async function resolveHrBatchSet(
  batchIds: unknown,
  opts: { igOnly?: boolean } = {},
): Promise<{ ok: true; batchId: Types.ObjectId; extras: Types.ObjectId[] } | { ok: false; status: number; error: string }> {
  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return { ok: false, status: 400, error: 'Select at least one batch' }
  }
  let first: Types.ObjectId
  try { first = new Types.ObjectId(String(batchIds[0])) } catch {
    return { ok: false, status: 400, error: 'Invalid batchId in batchIds' }
  }
  const primary = await Batch.findById(first)
  if (!primary) return { ok: false, status: 404, error: 'Batch not found' }
  if (opts.igOnly && primary.type !== 'IG') {
    return { ok: false, status: 400, error: 'Sessions can only be logged against IG batches on this endpoint' }
  }
  const r = await resolveExtraBatches(batchIds, primary, opts)
  if (!r.ok) return r
  return { ok: true, batchId: primary._id as Types.ObjectId, extras: r.extras }
}
