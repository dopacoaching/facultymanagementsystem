/**
 * Entry types for campuses that record more than plain classes (Studio:
 * Live and Shoot). A Shoot entry counts 1.75x the time taken. Mirrors
 * server/src/utils/entryTypes.ts — keep the two in sync.
 */
export type EntryType = 'LIVE' | 'SHOOT'

export const ENTRY_TYPES: EntryType[] = ['LIVE', 'SHOOT']

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = { LIVE: 'Live', SHOOT: 'Shoot' }

export const SHOOT_MULTIPLIER = 1.75

/** Shoot hours for a raw duration: multiplied in whole minutes (60m -> 1h 45m). */
export function shootHours(rawHours: number): number {
  return Math.round(Math.round(rawHours * 60) * SHOOT_MULTIPLIER) / 60
}

export function isEntryType(v: unknown): v is EntryType {
  return v === 'LIVE' || v === 'SHOOT'
}

/** Studio Live deducts every break in full (no 15-minute free grace). One rule,
 *  used by the form, both edit screens and the server. Entries with no type
 *  (everything saved before Live/Shoot existed) keep the normal grace. */
export const usesFullBreak = (entryType: EntryType | '' | null | undefined): boolean => entryType === 'LIVE'
