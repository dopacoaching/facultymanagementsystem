import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getPageTitle, getRouteMeta, getBreadcrumbs, getNavForRole, navLabelFor,
} from '../routeMeta'

// ── Finding D: nested / history screens must not inherit a sibling's title ────

test('history routes get their own title, not the parent "Log Session"', () => {
  assert.equal(getPageTitle('/coordinator'), 'Log Session')
  assert.equal(getPageTitle('/coordinator/history'), 'Session History')
  assert.equal(getPageTitle('/ig/sessions'), 'IG Sessions')
  assert.equal(getPageTitle('/ig/sessions/history'), 'IG Session History')
})

test('specialised HR reports are not all labelled "Salary Reports"', () => {
  assert.equal(getPageTitle('/hr/reports'), 'Reports')
  assert.equal(getPageTitle('/hr/reports/faculty-hours'), 'Faculty Hours by Subject')
  assert.equal(getPageTitle('/hr/reports/class-sessions'), 'Class Sessions Report')
  assert.equal(getPageTitle('/hr/reports/ig-sessions'), 'IG Class Sessions Report')
})

test('deep academics screens resolve to their own titles', () => {
  assert.equal(getPageTitle('/academics'), 'Academics Dashboard')
  assert.equal(getPageTitle('/academics/syllabus/progress'), 'Syllabus Progress')
  assert.equal(getPageTitle('/academics/availability'), 'Faculty Availability')
})

test('an unregistered deep link falls back to the nearest ancestor, never a sibling', () => {
  assert.equal(getPageTitle('/hr/reports/faculty-hours/2026'), 'Faculty Hours by Subject')
  assert.equal(getPageTitle('/totally/unknown'), 'DOPA FMS')
})

test('trailing slashes are tolerated', () => {
  assert.equal(getPageTitle('/coordinator/history/'), 'Session History')
  assert.equal(getRouteMeta('/hr/')?.title, 'HR Dashboard')
})

// ── Breadcrumbs ─────────────────────────────────────────────────────────────

test('breadcrumb trail follows parent links root-first', () => {
  const trail = getBreadcrumbs('/hr/reports/ig-sessions').map((r) => r.title)
  assert.deepEqual(trail, ['HR Dashboard', 'Reports', 'IG Class Sessions Report'])
})

// ── Role visibility (navigation only; backend stays authoritative) ───────────

test('a class teacher only sees their two log/history entries', () => {
  const groups = getNavForRole('CLASS_TEACHER')
  const hrefs = groups.flatMap((g) => g.items.map((i) => i.path))
  assert.deepEqual(hrefs, ['/coordinator', '/coordinator/history'])
})

test('IG class teacher sees "Log Session" label for /ig/sessions; IG academics manager sees "IG Sessions"', () => {
  const meta = getRouteMeta('/ig/sessions')!
  assert.equal(navLabelFor(meta, 'IG_CLASS_TEACHER'), 'Log Session')
  assert.equal(navLabelFor(meta, 'IG_ACADEMICS_MANAGER'), 'IG Sessions')
})

test('faculty self-service nav never exposes HR or admin routes', () => {
  const hrefs = getNavForRole('FACULTY').flatMap((g) => g.items.map((i) => i.path))
  assert.ok(hrefs.every((h) => h.startsWith('/faculty')))
})

test('scheduling entry is shown to ADMIN and both academics-manager roles, hidden unless the feature flag is passed', () => {
  const adminOff = getNavForRole('ADMIN').flatMap((g) => g.items.map((i) => i.path))
  assert.ok(!adminOff.includes('/scheduling'))
  const adminOn = getNavForRole('ADMIN', { SCHEDULING_ENABLED: true })
    .flatMap((g) => g.items.map((i) => i.path))
  assert.ok(adminOn.includes('/scheduling'))

  // Each academics-manager role also sees it once the flag is on — they're
  // scoped server-side to their own batch type (Repeaters or IG).
  const acMgrOff = getNavForRole('ACADEMICS_MANAGER').flatMap((g) => g.items.map((i) => i.path))
  assert.ok(!acMgrOff.includes('/scheduling'))
  const acMgr = getNavForRole('ACADEMICS_MANAGER', { SCHEDULING_ENABLED: true })
    .flatMap((g) => g.items.map((i) => i.path))
  assert.ok(acMgr.includes('/scheduling'))
  const igMgr = getNavForRole('IG_ACADEMICS_MANAGER', { SCHEDULING_ENABLED: true })
    .flatMap((g) => g.items.map((i) => i.path))
  assert.ok(igMgr.includes('/scheduling'))

  // Never shown to any other role, flag on or off.
  const hr = getNavForRole('HR_MANAGER', { SCHEDULING_ENABLED: true })
    .flatMap((g) => g.items.map((i) => i.path))
  assert.ok(!hr.includes('/scheduling'))
})

test('admin nav is grouped into sections; focused roles stay flat', () => {
  const admin = getNavForRole('ADMIN')
  assert.ok(admin.some((g) => g.section === 'HR'))
  assert.ok(admin.some((g) => g.section === 'System'))
  const hr = getNavForRole('HR_MANAGER')
  assert.equal(hr.length, 1)
  assert.equal(hr[0].section, null)
})
