/** Class modes a session can carry, in the order HR and Admin filter by them. */
export const CLASS_MODE_FILTERS = [
  { value: 'ONLINE',                  label: 'Online' },
  { value: 'OFFLINE',                 label: 'Offline' },
  { value: 'ONLINE_DOUBT_CLEARANCE',  label: 'Online doubt clearance' },
  { value: 'OFFLINE_DOUBT_CLEARANCE', label: 'Offline doubt clearance' },
] as const
