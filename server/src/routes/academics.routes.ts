import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getSessions, createSession, cancelSession, updateSessionStatus, updateSession, getFacultyHoursSummary } from '../controllers/session.controller'
import {
  getAvailability, getAllAvailabilityForMonth,
  addAvailabilityDates, updateAvailabilityEntry, deleteAvailabilityEntry,
} from '../controllers/availability.controller'
import {
  getSchedules, createOrUpdateSchedule, publishSchedule, reviseSchedule, deleteSchedule,
  updateExamTopic, suggestTopic, getChapters, updateChapter, getChapterSummary,
} from '../controllers/schedule.controller'
import {
  getAnnualSyllabus, getSyllabusChapters, getBatchProgress,
  getBehindScheduleBatches, getSplitChapters,
} from '../controllers/syllabus.controller'
import type { Request, Response, NextFunction } from 'express'

const router = Router()
router.use(authenticate)

// Middleware: when no batchId is given, exclude IG batches so only
// Academics (residential/offline/online) sessions are returned.
function excludeIGBatches(req: Request, _res: Response, next: NextFunction) {
  if (!req.query.batchId && !req.query.batchType) {
    req.query.excludeBatchType = 'IG'
  }
  next()
}

// ── Faculty hours vs contract — academics view (no salary data) ───────────────
router.get('/faculty-hours', authorize('ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), getFacultyHoursSummary)

// ── Faculty Availability ──────────────────────────────────────────────────────
// Order: specific path (/all) before parameterized (/:id)
router.get('/availability/all', authorize('ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), getAllAvailabilityForMonth)
router.get('/availability',     authorize('ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), getAvailability)
router.post('/availability',    authorize('ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), addAvailabilityDates)
router.patch('/availability/:id',  authorize('ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), updateAvailabilityEntry)
router.delete('/availability/:id', authorize('ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), deleteAvailabilityEntry)

// ── Sessions ─────────────────────────────────────────────────────────────────
// GET: exclude IG batches when no explicit batchId given
router.get('/sessions', authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), excludeIGBatches, getSessions)
router.post('/sessions', authorize('COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), createSession)
router.post('/sessions/cancel', authorize('COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), cancelSession)
router.patch('/sessions/:id/status', authorize('COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), updateSessionStatus)
// Full edit — admin / manager only
router.patch('/sessions/:id', authorize('ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), updateSession)

// ── Schedule (REST plural + legacy singular) ──────────────────────────────────
router.get('/schedules', authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getSchedules)
router.get('/schedule',  authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getSchedules)
router.post('/schedules', authorize('ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), createOrUpdateSchedule)
router.post('/schedule', authorize('ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), createOrUpdateSchedule)

// Exam topic update (PATCH — ACADEMICS_MANAGER / ADMIN only)
router.patch('/schedules/:id/exam-topic', authorize('ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), updateExamTopic)

// Publish
router.post('/schedules/:id/publish', authorize('ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), publishSchedule)
router.post('/schedule/publish', authorize('ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), publishSchedule)

// Revise (create revised draft from a published schedule)
router.post('/schedules/:id/revise', authorize('ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), reviseSchedule)

// Delete (unpublished drafts/revisions only)
router.delete('/schedules/:id', authorize('ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), deleteSchedule)

// ── Exam topic suggestion ─────────────────────────────────────────────────────
router.get('/exams/suggest', authorize('COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), suggestTopic)

// ── Chapters ──────────────────────────────────────────────────────────────────
// Summary aggregate — used by the academics dashboard to avoid N parallel queries.
router.get('/chapters/summary', authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), getChapterSummary)
router.get('/chapters',         authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'), getChapters)
// Coordinators mark video-complete; managers can also set facultyClassDone manually
router.patch('/chapters/:id', authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN'), updateChapter)

// ── Syllabus (Annual Chapter Plan) ───────────────────────────────────────────
// Order matters: specific paths before parameterized
router.get('/syllabus/chapters',          authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getSyllabusChapters)
router.get('/syllabus/split-chapters',    authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getSplitChapters)
router.get('/syllabus/behind',            authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getBehindScheduleBatches)
router.get('/syllabus/progress/:batchId', authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getBatchProgress)
router.get('/syllabus',                   authorize('COORDINATOR', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getAnnualSyllabus)

export default router
