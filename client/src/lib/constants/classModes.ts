/** Class modes a session can carry, in the order HR and Admin filter and sort by them. */
export const CLASS_MODE_FILTERS = [
  { value: 'ONLINE',                  label: 'Online' },
  { value: 'OFFLINE',                 label: 'Offline' },
  { value: 'ONLINE_DOUBT_CLEARANCE',  label: 'Online Doubt Clearance' },
  { value: 'OFFLINE_DOUBT_CLEARANCE', label: 'Offline Doubt Clearance' },
] as const

/** One label per mode, so a filter option and a table badge never disagree. */
export const CLASS_MODE_LABELS: Record<string, string> = Object.fromEntries(
  CLASS_MODE_FILTERS.map((m) => [m.value, m.label]),
)

/** Sort position of each mode; unknown or missing modes sort last. */
export const CLASS_MODE_ORDER: string[] = CLASS_MODE_FILTERS.map((m) => m.value)
