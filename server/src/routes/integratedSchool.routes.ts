import { Router }     from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getSessions, createSession, updateSessionStatus, cancelSession, updateSession } from '../controllers/session.controller'
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

// ─── IS Sessions (reuse shared session controller, scoped to IS) ──────────────
// FACULTY included (scoped to own sessions inside the controller).
router.get(
  '/sessions',
  authorize('IG_CLASS_TEACHER', 'CLASS_TEACHER', 'HR_MANAGER', 'ADMIN', 'FACULTY'),
  injectISBatchType,
  getSessions,
)
router.post(
  '/sessions',
  authorize('IG_CLASS_TEACHER', 'CLASS_TEACHER', 'ADMIN'),
  createSession,
)
router.post(
  '/sessions/cancel',
  authorize('IG_CLASS_TEACHER', 'CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'),
  cancelSession,
)
router.patch(
  '/sessions/:id/status',
  authorize('IG_CLASS_TEACHER', 'CLASS_TEACHER', 'HR_MANAGER', 'ADMIN'),
  updateSessionStatus,
)
router.patch(
  '/sessions/:id',
  authorize('HR_MANAGER', 'ADMIN'),
  updateSession,
)

export default router
