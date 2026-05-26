import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getAllFaculty, getFacultyById, createFaculty, updateFaculty, deactivateFaculty, getBatches,
} from '../controllers/faculty.controller'
import {
  calcSalary, approveSalary, getAuditLog, getCarryForward, getSalaryReports, getMyHistory,
} from '../controllers/salary.controller'

const router = Router()

router.use(authenticate)

// Batches (read-only for all authenticated roles)
router.get('/batches', getBatches)

// Faculty
router.get('/faculty', getAllFaculty)
router.get('/faculty/:id', getFacultyById)
router.post('/faculty', authorize('HR_MANAGER', 'ADMIN'), createFaculty)
router.patch('/faculty/:id', authorize('HR_MANAGER', 'ADMIN'), updateFaculty)
router.delete('/faculty/:id', authorize('HR_MANAGER', 'ADMIN'), deactivateFaculty)

// Salary
router.get('/salary', authorize('HR_MANAGER', 'ADMIN', 'FACULTY'), calcSalary)
router.post('/salary/approve', authorize('HR_MANAGER', 'ADMIN'), approveSalary)
router.get('/salary/reports', authorize('HR_MANAGER', 'ADMIN'), getSalaryReports)
router.get('/salary/carry-forward', authorize('HR_MANAGER', 'ADMIN'), getCarryForward)
// Faculty-only: view own salary history
router.get('/salary/history', authorize('FACULTY'), getMyHistory)

// Audit log — ADMIN only
router.get('/audit-log', authorize('ADMIN'), getAuditLog)

export default router
