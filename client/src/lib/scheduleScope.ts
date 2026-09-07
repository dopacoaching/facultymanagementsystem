import { Batch } from '@/lib/models/Batch'
import type { JWTPayload } from '@/lib/auth'

/**
 * IG_ACADEMICS_MANAGER may only act on IG batches, and only within their assigned
 * campus when the token carries a campusId. Returns true when access is denied.
 * A no-op for every other role — batch-type scoping for ACADEMICS_MANAGER is
 * handled inline in the list/create handlers.
 */
export async function igScheduleScopeDenied(
  payload: JWTPayload,
  batchId: unknown,
): Promise<boolean> {
  if (payload.role !== 'IG_ACADEMICS_MANAGER') return false
  const batch = await Batch.findById(batchId as string).lean()
  if (!batch || batch.type !== 'IG') return true
  if (payload.campusId && batch.campusId?.toString() !== payload.campusId) return true
  return false
}
