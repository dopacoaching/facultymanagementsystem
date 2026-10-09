import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getSessions, createSession, cancelSession, updateSessionStatus, updateSession } from '../controllers/session.controller'
import { getChapters } from '../controllers/chapter.controller'
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

// ── Sessions ─────────────────────────────────────────────────────────────────
// GET: exclude IG batches when no explicit batchId given.
// FACULTY included (scoped to own sessions inside the controller).
router.get('/sessions', authorize('CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN', 'FACULTY'), excludeIGBatches, getSessions)
router.post('/sessions', authorize('CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'), createSession)
router.post('/sessions/cancel', authorize('CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'), cancelSession)
router.patch('/sessions/:id/status', authorize('CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'), updateSessionStatus)
// Full edit — HR / admin only
router.patch('/sessions/:id', authorize('HR_MANAGER', 'ADMIN'), updateSession)

// ── Chapters ──────────────────────────────────────────────────────────────────
router.get('/chapters',         authorize('CLASS_TEACHER', 'IG_CLASS_TEACHER', 'ADMIN'), getChapters)

// ── Syllabus (Annual Chapter Plan) ───────────────────────────────────────────
// Order matters: specific paths before parameterized
router.get('/syllabus/chapters',          authorize('CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'), getSyllabusChapters)
router.get('/syllabus/split-chapters',    authorize('CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'), getSplitChapters)
router.get('/syllabus/behind',            authorize('CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'), getBehindScheduleBatches)
router.get('/syllabus/progress/:batchId', authorize('CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'), getBatchProgress)
router.get('/syllabus',                   authorize('CLASS_TEACHER', 'IG_CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'), getAnnualSyllabus)

export default router
