import { BatchType } from '@/lib/types'

/**
 * Returns true for batch types where video-first teaching applies.
 *
 * RESIDENTIAL and ONLINE batches both use video-first delivery:
 *  - RESIDENTIAL: students watch the recorded/live video before the session
 *  - ONLINE:      remote students watch online — same delivery model
 *
 * Only OFFLINE batches use direct in-person instruction without prior video.
 * INTEGRATED_SCHOOL follows its own academic calendar and is excluded here.
 */
export function isVideoFirstBatch(type: BatchType | string): boolean {
  return type === 'RESIDENTIAL' || type === 'ONLINE'
}
