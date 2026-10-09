import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getPageTitle, getRouteMeta, getBreadcrumbs, getNavForRole, navLabelFor,
} from '../routeMeta'

// ── Finding D: nested / history screens must not inherit a sibling's title ────

test('history routes get their own title, not the parent "Push Board"', () => {
  assert.equal(getPageTitle('/coordinator'), 'Push Board')
  assert.equal(getPageTitle('/coordinator/history'), 'Session History')
  assert.equal(getPageTitle('/ig/sessions/history'), 'IG Session History')
})

test('specialised HR reports are not all labelled "Salary Reports"', () => {
  assert.equal(getPageTitle('/hr/reports'), 'Entries Report')
  assert.equal(getPageTitle('/hr/reports/faculty-hours'), 'Faculty Hours by Subject')
  assert.equal(getPageTitle('/hr/reports/class-sessions'), 'Class Sessions Report')
  assert.equal(getPageTitle('/hr/reports/ig-sessions'), 'IG Class Sessions Report')
})

test('deep academics screens resolve to their own titles', () => {
  assert.equal(getPageTitle('/academics/sessions'), 'Sessions')
  assert.equal(getPageTitle('/academics/syllabus/progress'), 'Syllabus Progress')
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
  assert.deepEqual(trail, ['HR Dashboard', 'Entries Report', 'IG Class Sessions Report'])
})

// ── Role visibility (navigation only; backend stays authoritative) ───────────

test('a class teacher only sees their two log/history entries', () => {
  const groups = getNavForRole('CLASS_TEACHER')
  const hrefs = groups.flatMap((g) => g.items.map((i) => i.path))
  assert.deepEqual(hrefs, ['/coordinator', '/coordinator/history'])
})

test('IG class teacher logs on Push Board and keeps their own history', () => {
  const hrefs = getNavForRole('IG_CLASS_TEACHER').flatMap((g) => g.items.map((i) => i.path))
  assert.deepEqual(hrefs, ['/coordinator', '/ig/sessions/history'])
  assert.equal(navLabelFor(getRouteMeta('/coordinator')!, 'IG_CLASS_TEACHER'), 'Push Board')
})

test('faculty self-service nav never exposes HR or admin routes', () => {
  const hrefs = getNavForRole('FACULTY').flatMap((g) => g.items.map((i) => i.path))
  assert.ok(hrefs.every((h) => h.startsWith('/faculty')))
})

test('admin nav is grouped into sections; focused roles stay flat', () => {
  const admin = getNavForRole('ADMIN')
  assert.ok(admin.some((g) => g.section === 'HR'))
  assert.ok(admin.some((g) => g.section === 'System'))
  const hr = getNavForRole('HR_MANAGER')
  assert.equal(hr.length, 1)
  assert.equal(hr[0].section, null)
})
