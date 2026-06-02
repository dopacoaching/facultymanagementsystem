import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getSessions, createSession, cancelSession, updateSessionStatus, updateSession } from '../controllers/session.controller'
import {
  getSchedules, createOrUpdateSchedule, publishSchedule, reviseSchedule,
  updateExamTopic, suggestTopic, getChapters, updateChapter, getChapterSummary,
} from '../controllers/schedule.controller'
import type { Request, Response, NextFunction } from 'express'

const router = Router()
router.use(authenticate)

// Middleware: when no batchId is given, exclude IS-type batches so only
// Academics (residential/offline/online) sessions are returned.
function excludeISBatches(req: Request, _res: Response, next: NextFunction) {
  if (!req.query.batchId && !req.query.batchType) {
    req.query.excludeBatchType = 'INTEGRATED_SCHOOL'
  }
  next()
}

// ── Sessions ─────────────────────────────────────────────────────────────────
// GET: exclude IS batches when no explicit batchId given
router.get('/sessions', excludeISBatches, getSessions)
router.post('/sessions', authorize('COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), createSession)
router.post('/sessions/cancel', authorize('COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), cancelSession)
router.patch('/sessions/:id/status', authorize('COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), updateSessionStatus)
// Full edit — admin / manager only
router.patch('/sessions/:id', authorize('ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), updateSession)

// ── Schedule (REST plural + legacy singular) ──────────────────────────────────
router.get('/schedules', getSchedules)
router.get('/schedule', getSchedules)
router.post('/schedules', authorize('ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), createOrUpdateSchedule)
router.post('/schedule', authorize('ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), createOrUpdateSchedule)

// Exam topic update (PATCH — ACADEMICS_MANAGER / ADMIN only)
router.patch('/schedules/:id/exam-topic', authorize('ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), updateExamTopic)

// Publish
router.post('/schedules/:id/publish', authorize('ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), publishSchedule)
router.post('/schedule/publish', authorize('ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), publishSchedule)

// Revise (create revised draft from a published schedule)
router.post('/schedules/:id/revise', authorize('ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), reviseSchedule)

// ── Exam topic suggestion ─────────────────────────────────────────────────────
router.get('/exams/suggest', suggestTopic)

// ── Chapters ──────────────────────────────────────────────────────────────────
// Summary aggregate — used by the academics dashboard to avoid N parallel queries.
router.get('/chapters/summary', getChapterSummary)
router.get('/chapters', getChapters)
// Coordinators mark video-complete; managers can also set facultyClassDone manually
router.patch('/chapters/:id', authorize('COORDINATOR', 'IS_COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN'), updateChapter)

export default router
