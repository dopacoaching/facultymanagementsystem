import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { Faculty } from '../models/Faculty'
import { Batch } from '../models/Batch'
import { writeAuditLog } from '../services/salary/audit'
import { asyncHandler } from '../utils/asyncHandler'
import { validateObjectId } from '../utils/objectId'
import type { FacultyType, SalaryModel } from '../types'

// Fields that HR/Admin may set when creating or updating a Faculty document.
// Explicitly whitelisted to prevent mass assignment.
const FACULTY_WRITABLE = [
  'name', 'subject', 'type', 'salaryModel', 'isActive',
  'hourlyRate', 'fixedMonthlySalary', 'monthlyHourQuota', 'monthlyDayQuota',
  'overtimeThreshold', 'overtimeRate', 'fixedComponent', 'variableComponent',
  'totalContractDays', 'monthlyLeaveAllowance', 'aprilLeaveAllowance',
  'minDaysNormal', 'minDaysDryMonth', 'configurablePayJson',
] as const

type FacultyWritable = (typeof FACULTY_WRITABLE)[number]

function pickFacultyFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of FACULTY_WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  return out
}

export const getAllFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { includeInactive } = req.query
  const filter = includeInactive === 'true' ? {} : { isActive: true }
  const faculty = await Faculty.find(filter).sort({ name: 1 })
  res.json(faculty)
})

export const getFacultyById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const oid = validateObjectId(req.params.id, 'facultyId', res)
  if (!oid) return
  const faculty = await Faculty.findById(oid)
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }
  res.json(faculty)
})

export const createFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, subject, type, salaryModel } = req.body as {
    name?: string; subject?: string; type?: FacultyType; salaryModel?: SalaryModel
  }
  if (!name?.trim())    { res.status(400).json({ error: 'name is required' }); return }
  if (!subject?.trim()) { res.status(400).json({ error: 'subject is required' }); return }
  if (!type)            { res.status(400).json({ error: 'type is required' }); return }
  if (!salaryModel)     { res.status(400).json({ error: 'salaryModel is required' }); return }

  const safeData = pickFacultyFields(req.body as Record<string, unknown>)
  const faculty = await Faculty.create(safeData)

  await writeAuditLog({
    eventType: 'FACULTY_CREATED',
    facultyId: faculty._id.toString(),
    facultyName: faculty.name,
    amount: 0,
    reason: 'Faculty profile created',
    loggedByUserId: req.user!.userId,
  })
  res.status(201).json(faculty)
})

export const updateFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const oid = validateObjectId(req.params.id, 'facultyId', res)
  if (!oid) return

  const safeData = pickFacultyFields(req.body as Record<string, unknown>)
  if (Object.keys(safeData).length === 0) {
    res.status(400).json({ error: 'No valid fields provided for update' }); return
  }

  const faculty = await Faculty.findByIdAndUpdate(oid, safeData, { new: true, runValidators: true })
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }

  const SALARY_FIELDS: FacultyWritable[] = [
    'hourlyRate', 'fixedMonthlySalary', 'fixedComponent', 'variableComponent',
    'overtimeRate', 'configurablePayJson',
  ]
  if (SALARY_FIELDS.some((f) => f in safeData)) {
    await writeAuditLog({
      eventType: 'PAY_CONFIG_UPDATED',
      facultyId: faculty._id.toString(),
      facultyName: faculty.name,
      amount: 0,
      reason: `Pay config updated (${Object.keys(safeData).join(', ')})`,
      loggedByUserId: req.user!.userId,
    })
  } else {
    await writeAuditLog({
      eventType: 'FACULTY_UPDATED',
      facultyId: faculty._id.toString(),
      facultyName: faculty.name,
      amount: 0,
      reason: `Profile updated (${Object.keys(safeData).join(', ')})`,
      loggedByUserId: req.user!.userId,
    })
  }
  res.json(faculty)
})

export const deactivateFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const oid = validateObjectId(req.params.id, 'facultyId', res)
  if (!oid) return
  const faculty = await Faculty.findByIdAndUpdate(oid, { isActive: false }, { new: true })
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }
  res.json({ success: true })
})

export const getBatches = asyncHandler(async (_req: AuthRequest, res: Response) => {
  // Populate campusId so the client can derive campus names (used in IS timetable campus filter)
  const batches = await Batch.find({ isActive: true })
    .populate('campusId', 'name location')
    .sort({ name: 1 })
  res.json(batches)
})
