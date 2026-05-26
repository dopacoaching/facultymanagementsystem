import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getSessions, createSession, updateSessionStatus, cancelSession, updateSession } from '../controllers/session.controller'
import { getTimetable, upsertTimetableSlot, deleteTimetableSlot } from '../controllers/timetable.controller'
import type { Request, Response, NextFunction } from 'express'

const router = Router()
router.use(authenticate)

// Middleware: inject batchType=INTEGRATED_SCHOOL into the query so getSessions
// returns only IS sessions, not all sessions from every batch type.
function injectISBatchType(req: Request, _res: Response, next: NextFunction) {
  if (!req.query.batchId) {
    req.query.batchType = 'INTEGRATED_SCHOOL'
  }
  next()
}

// IS Timetable
router.get('/timetable', getTimetable)
router.post('/timetable', authorize('IS_ACADEMICS_MANAGER', 'IS_COORDINATOR', 'ACADEMICS_MANAGER', 'COORDINATOR', 'HR_MANAGER', 'ADMIN'), upsertTimetableSlot)
router.delete('/timetable/:id', authorize('IS_ACADEMICS_MANAGER', 'ADMIN'), deleteTimetableSlot)

// IS Sessions
router.get('/sessions', injectISBatchType, getSessions)
router.post('/sessions', authorize('IS_COORDINATOR', 'IS_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'ADMIN'), createSession)
router.post('/sessions/cancel', authorize('IS_COORDINATOR', 'IS_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), cancelSession)
router.patch('/sessions/:id/status', authorize('IS_COORDINATOR', 'IS_ACADEMICS_MANAGER', 'COORDINATOR', 'ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), updateSessionStatus)
// Full edit — admin / manager only (not coordinators)
router.patch('/sessions/:id', authorize('IS_ACADEMICS_MANAGER', 'HR_MANAGER', 'ADMIN'), updateSession)

export default router
