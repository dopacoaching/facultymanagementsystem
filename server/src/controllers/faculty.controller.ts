import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { Faculty } from '../models/Faculty'
import { Batch } from '../models/Batch'
import { writeAuditLog } from '../services/salary/audit'
import { asyncHandler } from '../utils/asyncHandler'

export const getAllFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { includeInactive } = req.query
  const filter = includeInactive === 'true' ? {} : { isActive: true }
  const faculty = await Faculty.find(filter).sort({ name: 1 })
  res.json(faculty)
})

export const getFacultyById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const faculty = await Faculty.findById(req.params.id)
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }
  res.json(faculty)
})

export const createFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const faculty = await Faculty.create(req.body)
  await writeAuditLog({
    eventType: 'FACULTY_CREATED',
    facultyId: faculty._id.toString(),
    facultyName: faculty.name,
    amount: 0,
    reason: `Faculty profile created`,
    loggedByUserId: req.user!.userId,
  })
  res.status(201).json(faculty)
})

export const updateFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }

  const SALARY_FIELDS = ['hourlyRate', 'fixedMonthlySalary', 'fixedComponent', 'variableComponent', 'overtimeRate', 'configurablePayJson']
  if (SALARY_FIELDS.some((f) => f in req.body)) {
    await writeAuditLog({
      eventType: 'PAY_CONFIG_UPDATED',
      facultyId: faculty._id.toString(),
      facultyName: faculty.name,
      amount: 0,
      reason: `Pay config updated (${Object.keys(req.body).join(', ')})`,
      loggedByUserId: req.user!.userId,
    })
  } else {
    await writeAuditLog({
      eventType: 'FACULTY_UPDATED',
      facultyId: faculty._id.toString(),
      facultyName: faculty.name,
      amount: 0,
      reason: `Profile updated (${Object.keys(req.body).join(', ')})`,
      loggedByUserId: req.user!.userId,
    })
  }
  res.json(faculty)
})

export const deactivateFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!faculty) { res.status(404).json({ error: 'Faculty not found' }); return }
  res.json({ success: true })
})

export const getBatches = asyncHandler(async (_req: AuthRequest, res: Response) => {
  // NOTE: Batch.find({ isActive: true }) is correct — Batch model has isActive:Boolean default true
  const batches = await Batch.find({ isActive: true }).sort({ name: 1 })
  res.json(batches)
})
