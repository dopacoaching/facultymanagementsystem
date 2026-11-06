import type { SVGProps } from 'react'

/**
 * One consistent stroke icon set (24px grid, 1.75 stroke, round caps) — the only icon source in the app.
 * Usage: <Icon name="users" size={18} />  — decorative by default (aria-hidden); pass title to label it.
 */
const PATHS = {
  home:       'M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5',
  users:      'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.36M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  user:       'M19 20v-1.5a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4V20M12 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  shield:     'M12 3 4.5 6v5.5c0 4.4 3 8.2 7.5 9.5 4.5-1.3 7.5-5.1 7.5-9.5V6L12 3ZM9 12l2 2 4-4',
  log:        'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  wallet:     'M4 7.5A2.5 2.5 0 0 1 6.5 5H19v3M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5ZM16 13.5h.01',
  chart:      'M4 20V10M10 20V4M16 20v-7M22 20H2',
  report:     'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v5h5M9 13h6M9 17h6',
  inbox:      'M3 13l2.5-7.5A2 2 0 0 1 7.4 4h9.2a2 2 0 0 1 1.9 1.5L21 13M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5M3 13h5l1 2h6l1-2h5',
  ban:        'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8',
  clock:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  school:     'M3 9.5 12 5l9 4.5-9 4.5-9-4.5ZM7 12v4.5c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5V12M21 9.5V15',
  building:   'M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 10h3a1 1 0 0 1 1 1v10M3 21h18M9 8h2M9 12h2M9 16h2',
  layers:     'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5',
  book:       'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15ZM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6',
  bookmark:   'M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1Z',
  list:       'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  edit:       'M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4',
  send:       'M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z',
  history:    'M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5M3.5 4v4.5H8M12 7.5V12l3 2',
  calendar:   'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM4 10h16M8 3v4M16 3v4',
  key:        'M15.5 9.5a4 4 0 1 0-3.4 3.96L13 14.5h2v2h2v2h3v-3l-5.4-5.4a4 4 0 0 0-.1-.6ZM8 8.5h.01',
  logout:     'M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9',
  sun:        'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon:       'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  plus:       'M12 5v14M5 12h14',
  search:     'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-4.3-4.3',
  filter:     'M3 5h18l-7 8.5V19l-4 2v-7.5L3 5Z',
  download:   'M12 4v11M7 11l5 5 5-5M5 20h14',
  check:      'm5 12.5 4.5 4.5L19 7.5',
  x:          'M6 6l12 12M18 6 6 18',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft:  'm15 6-6 6 6 6',
  chevronDown:  'm6 9 6 6 6-6',
  alert:      'M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info:       'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01',
  video:      'M3 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM15 10.5l6-3.5v10l-6-3.5',
  link:       'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1',
  menu:       'M4 7h16M4 12h16M4 17h16',
  panel:      'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM9 5v14',
  grid:       'M4 4h6v6H4V4ZM14 4h6v6h-6V4ZM4 14h6v6H4v-6ZM14 14h6v6h-6v-6Z',
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  title?: string
}

export function Icon({ name, size = 18, title, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={className}
      {...rest}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  )
}

export default Icon
