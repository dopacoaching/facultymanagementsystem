import { Router }     from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getSessions, createSession, updateSessionStatus, cancelSession, updateSession } from '../controllers/session.controller'
import {
  assignSlot, getDailyTimetable, getWeeklyTimetable, updateSlot, deleteSlot,
  getSpecialDays, createSpecialDay, deleteSpecialDay,
  getISChapters, updateISChapter,
  getTimings,
} from '../controllers/integratedSchool.controller'
import type { Request, Response, NextFunction } from 'express'

const router = Router()
router.use(authenticate)

// Middleware: scope getSessions to IS batches only (unless batchId is explicit)
function injectISBatchType(req: Request, _res: Response, next: NextFunction) {
  if (!req.query.batchId) {
    req.query.batchType = 'IG'
  }
  next()
}

// ─── Timetable (date-based) ───────────────────────────────────────────────────
router.get ('/timetable/daily',  authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getDailyTimetable)
router.get ('/timetable/weekly', authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getWeeklyTimetable)
router.post(
  '/timetable/assign',
  authorize('IG_ACADEMICS_MANAGER', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'),
  assignSlot,
)
router.patch(
  '/timetable/:id',
  authorize('IG_ACADEMICS_MANAGER', 'IG_COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'),
  updateSlot,
)
router.delete(
  '/timetable/:id',
  authorize('IG_ACADEMICS_MANAGER', 'ADMIN'),
  deleteSlot,
)

// Timings helper
router.get('/timings', authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getTimings)

// ─── Special Days ─────────────────────────────────────────────────────────────
router.get   ('/special-days',     authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), getSpecialDays)
router.post  ('/special-days',     authorize('IG_ACADEMICS_MANAGER', 'ACADEMICS_MANAGER', 'ADMIN'), createSpecialDay)
router.delete('/special-days/:id', authorize('IG_ACADEMICS_MANAGER', 'ADMIN'), deleteSpecialDay)

// ─── IS Batch Chapters ────────────────────────────────────────────────────────
router.get  ('/chapters',     authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN'), getISChapters)
router.patch('/chapters/:id', authorize('IG_ACADEMICS_MANAGER', 'ACADEMICS_MANAGER', 'ADMIN'), updateISChapter)

// ─── IS Sessions (reuse shared session controller, scoped to IS) ──────────────
// FACULTY included (scoped to own sessions inside the controller).
router.get(
  '/sessions',
  authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN', 'FACULTY'),
  injectISBatchType,
  getSessions,
)
router.post(
  '/sessions',
  authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN'),
  createSession,
)
router.post(
  '/sessions/cancel',
  authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'),
  cancelSession,
)
router.patch(
  '/sessions/:id/status',
  authorize('IG_COORDINATOR', 'IG_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'),
  updateSessionStatus,
)
router.patch(
  '/sessions/:id',
  authorize('IG_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'),
  updateSession,
)

export default router
