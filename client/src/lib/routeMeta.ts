/**
 * routeMeta — the single source of truth for page titles, navigation labels,
 * section grouping, and per-route role visibility.
 *
 * Both the app shell (topbar title) and the sidebar navigation read from here,
 * so a route can never again be mislabelled by a fuzzy path-prefix fallback
 * (e.g. history screens showing "Log Session", or specialised HR reports
 * inheriting "Salary Reports").
 *
 * Roles are advisory for *navigation visibility only*. Backend authorization and
 * the per-section layout guards remain authoritative — hiding a nav item is not
 * an access control.
 */

export type Role =
  | 'ADMIN'
  | 'HR_MANAGER'
  | 'CLASS_TEACHER'
  | 'IG_CLASS_TEACHER'
  | 'FACULTY'

export interface RouteMeta {
  /** Exact pathname, no trailing slash. */
  path: string
  /** Topbar title + document-title fragment + breadcrumb leaf. */
  title: string
  /** Short label for the sidebar. Defaults to `title` when omitted. */
  navLabel?: string
  /** Per-role sidebar label override. */
  navLabelByRole?: Partial<Record<Role, string>>
  /** Sidebar section heading this route sits under (per role nav). */
  section?: string
  /** Roles that may see this in navigation. Empty/undefined ⇒ not in any nav. */
  navRoles?: Role[]
  /** Roles this route is meaningfully *about* — used for title lookup even when
   *  the route is reached without a nav entry (e.g. nested report screens). */
  roles?: Role[]
  /** Parent path for breadcrumb construction. */
  parent?: string
}

/**
 * Ordered so that, within a role, sidebar entries render in this order.
 * `navLabel`/`section`/`navRoles` drive the sidebar; `title` drives the shell.
 */
export const ROUTES: RouteMeta[] = [
  // ── Auth (no shell) ──────────────────────────────────────────────────────
  { path: '/login', title: 'Sign in' },
  { path: '/sso', title: 'Single sign-on' },
  { path: '/admin/login', title: 'Admin sign in' },
  { path: '/admin/sso', title: 'Admin single sign-on' },

  // ── Class Teacher (campus session logging) ───────────────────────────────
  {
    path: '/coordinator', title: 'Push Board', navLabel: 'Push Board',
    navRoles: ['CLASS_TEACHER', 'IG_CLASS_TEACHER'], roles: ['CLASS_TEACHER', 'IG_CLASS_TEACHER', 'ADMIN'],
  },
  {
    path: '/coordinator/history', title: 'Session History', navLabel: 'History',
    navRoles: ['CLASS_TEACHER'], roles: ['CLASS_TEACHER', 'ADMIN'],
    parent: '/coordinator',
  },

  // ── IG Class Teacher (logs on Push Board; own history screen) ─────────────
  {
    path: '/ig/sessions/history', title: 'IG Session History', navLabel: 'History',
    navRoles: ['IG_CLASS_TEACHER'], roles: ['IG_CLASS_TEACHER', 'ADMIN'],
    parent: '/coordinator',
  },

  // ── HR ──────────────────────────────────────────────────────────────────
  {
    path: '/hr', title: 'HR Dashboard', navLabel: 'Dashboard',
    navRoles: ['HR_MANAGER'], roles: ['HR_MANAGER', 'ADMIN'],
  },
  {
    path: '/hr/faculty', title: 'Faculty', navLabel: 'Faculty', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'], parent: '/hr',
  },
  {
    path: '/hr/salary', title: 'Salary Calculator', navLabel: 'Salary', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'], parent: '/hr',
  },
  {
    path: '/hr/reports', title: 'Entries Report', navLabel: 'Entries Report', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'], parent: '/hr',
  },
  {
    path: '/hr/reports/salary', title: 'Salary Reports', navLabel: 'Salary Reports', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'], parent: '/hr/reports',
  },
  {
    path: '/hr/reports/faculty-hours', title: 'Faculty Hours by Subject',
    navLabel: 'Faculty Hours', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'],
    parent: '/hr/reports',
  },
  {
    path: '/hr/reports/class-sessions', title: 'Class Sessions Report',
    navLabel: 'Class Sessions', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'],
    parent: '/hr/reports',
  },
  {
    path: '/hr/reports/ig-sessions', title: 'IG Class Sessions Report',
    navLabel: 'IG Class Sessions', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'],
    parent: '/hr/reports',
  },
  {
    path: '/hr/setup/campuses', title: 'Campuses', navLabel: 'Campuses', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'], parent: '/hr',
  },
  {
    path: '/hr/setup/batches', title: 'Batches', navLabel: 'Batches', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'], parent: '/hr',
  },
  {
    path: '/hr/setup/teachers', title: 'Teachers', navLabel: 'Teachers', section: 'HR',
    navRoles: ['HR_MANAGER', 'ADMIN'], roles: ['HR_MANAGER', 'ADMIN'], parent: '/hr',
  },
  {
    path: '/hr/audit-log', title: 'Audit Log', navLabel: 'Audit Log', section: 'HR',
    roles: ['HR_MANAGER', 'ADMIN'], parent: '/hr',
  },

  // ── Academics (Repeaters / DOPA) — Admin ─────────────────────────────────
  {
    path: '/academics/sessions', title: 'Sessions', navLabel: 'Sessions',
    navRoles: ['ADMIN'],
    section: 'Academics',
    roles: ['CLASS_TEACHER', 'ADMIN'],
  },
  {
    path: '/academics/syllabus', title: 'Syllabus', navLabel: 'Syllabus',
    navRoles: ['ADMIN'],
    section: 'Academics',
    roles: ['ADMIN'],
  },
  {
    path: '/academics/syllabus/progress', title: 'Syllabus Progress',
    roles: ['ADMIN'], parent: '/academics/syllabus',
  },

  // ── Admin ─────────────────────────────────────────────────────────────
  {
    path: '/admin', title: 'Admin Dashboard', navLabel: 'Dashboard',
    navRoles: ['ADMIN'], roles: ['ADMIN'],
  },
  {
    path: '/admin/users', title: 'User Management', navLabel: 'Users', section: 'System',
    navRoles: ['ADMIN'], roles: ['ADMIN'],
  },
  {
    path: '/admin/audit-log', title: 'Audit Log', navLabel: 'Audit Log', section: 'System',
    navRoles: ['ADMIN'], roles: ['ADMIN'],
  },

  // ── Faculty self-service ──────────────────────────────────────────────
  {
    path: '/faculty', title: 'Faculty Dashboard', navLabel: 'Dashboard',
    navRoles: ['FACULTY'], roles: ['FACULTY'],
  },
  {
    path: '/faculty/sessions', title: 'My Sessions', navLabel: 'My Sessions',
    navRoles: ['FACULTY'], roles: ['FACULTY'],
  },
  {
    path: '/faculty/salary', title: 'My Salary', navLabel: 'My Salary',
    navRoles: ['FACULTY'], roles: ['FACULTY'],
  },
]

const BY_PATH = new Map(ROUTES.map((r) => [r.path, r]))

/** Strip a trailing slash (but keep the root "/"). */
function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

/** Exact route metadata for a pathname, if any. */
export function getRouteMeta(pathname: string): RouteMeta | undefined {
  return BY_PATH.get(normalize(pathname))
}

/**
 * The page title for a pathname. Falls back to the nearest ancestor that has
 * metadata (so an un-registered deep link still gets a sensible, *accurate*
 * heading rather than an unrelated sibling's title), then to "DOPA FMS".
 */
export function getPageTitle(pathname: string): string {
  const p = normalize(pathname)
  const exact = BY_PATH.get(p)
  if (exact) return exact.title

  const ancestor = ROUTES
    .filter((r) => p.startsWith(r.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0]
  return ancestor?.title ?? 'DOPA FMS'
}

/** Breadcrumb trail (root-first) for a pathname, using `parent` links. */
export function getBreadcrumbs(pathname: string): RouteMeta[] {
  const trail: RouteMeta[] = []
  let cur = getRouteMeta(pathname)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.path)) {
    seen.add(cur.path)
    trail.unshift(cur)
    cur = cur.parent ? getRouteMeta(cur.parent) : undefined
  }
  return trail
}

export interface NavGroup {
  section: string | null
  items: RouteMeta[]
}

/**
 * Sidebar navigation for a role, grouped by section in declaration order.
 */
export function getNavForRole(role: Role | string | null): NavGroup[] {
  if (!role) return []
  const items = ROUTES.filter((r) => r.navRoles?.includes(role as Role))

  // Section headers only earn their place when a role's nav genuinely spans
  // multiple areas (the Admin case: System / HR / Academics). For a focused
  // role (HR, Academics, Class Teacher…) the nav stays flat.
  const distinctSections = new Set(
    items.map((r) => r.section).filter((s): s is string => !!s),
  )
  if (distinctSections.size < 2) {
    return [{ section: null, items }]
  }

  const groups: NavGroup[] = []
  for (const item of items) {
    const key = item.section ?? null
    let group = groups.find((g) => g.section === key)
    if (!group) { group = { section: key, items: [] }; groups.push(group) }
    group.items.push(item)
  }
  return groups
}

/** Label for a nav entry for a given role (role override ?? navLabel ?? title). */
export function navLabelFor(r: RouteMeta, role?: Role | string | null): string {
  if (role && r.navLabelByRole?.[role as Role]) return r.navLabelByRole[role as Role] as string
  return r.navLabel ?? r.title
}
