import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@/lib/models/Faculty'
import { writeAuditLog } from '@/lib/services/salary/audit'

const FACULTY_WRITABLE = [
  'name', 'subject', 'type', 'salaryModel', 'isActive',
  'hourlyRate', 'fixedMonthlySalary', 'monthlyHourQuota', 'monthlyDayQuota',
  'overtimeThreshold', 'overtimeRate', 'fixedComponent', 'variableComponent',
  'totalContractDays', 'monthlyLeaveAllowance', 'aprilLeaveAllowance',
  'minDaysNormal', 'minDaysDryMonth', 'configurablePayJson',
] as const

const SALARY_FIELDS = [
  'hourlyRate', 'fixedMonthlySalary', 'fixedComponent', 'variableComponent',
  'overtimeRate', 'configurablePayJson',
]

function pickFacultyFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of FACULTY_WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  return out
}

/** GET /api/hr/faculty/:id */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    // FACULTY role: can only view their own profile
    if (payload.role === 'FACULTY') {
      if (payload.facultyId !== id) {
        return withToken(json({ error: 'Forbidden' }, 403), refreshedToken)
      }
    }

    const faculty = await Faculty.findById(oid)
    if (!faculty) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)

    // Non-HR roles: strip salary data from response
    const isHR = payload.role === 'HR_MANAGER' || payload.role === 'ADMIN'
    if (!isHR) {
      const safe = faculty.toObject() as unknown as Record<string, unknown>
      const salaryFields = ['hourlyRate','fixedMonthlySalary','monthlyHourQuota','monthlyDayQuota',
        'overtimeThreshold','overtimeRate','fixedComponent','variableComponent',
        'totalContractDays','configurablePayJson','salaryModel']
      salaryFields.forEach(f => delete safe[f])
      return withToken(json(safe), refreshedToken)
    }

    return withToken(json(faculty), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/faculty/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH /api/hr/faculty/:id */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    const body = await req.json() as Record<string, unknown>
    const safeData = pickFacultyFields(body)

    if (Object.keys(safeData).length === 0) {
      return withToken(json({ error: 'No valid fields provided for update' }, 400), refreshedToken)
    }

    await connectDB()

    const faculty = await Faculty.findByIdAndUpdate(oid, safeData, { new: true, runValidators: true })
    if (!faculty) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)

    if (SALARY_FIELDS.some((f) => f in safeData)) {
      await writeAuditLog({
        category: 'HR', eventType: 'PAY_CONFIG_UPDATED',
        actorUserId: payload.userId, actorRole: payload.role,
        targetType: 'Faculty', targetId: faculty._id.toString(), targetName: faculty.name,
        facultyId: faculty._id.toString(), facultyName: faculty.name, amount: 0,
        description: `Pay config updated for ${faculty.name}: ${Object.keys(safeData).join(', ')}`,
        metadata: { fields: Object.keys(safeData) },
      })
    } else {
      await writeAuditLog({
        category: 'HR', eventType: 'FACULTY_UPDATED',
        actorUserId: payload.userId, actorRole: payload.role,
        targetType: 'Faculty', targetId: faculty._id.toString(), targetName: faculty.name,
        facultyId: faculty._id.toString(), facultyName: faculty.name, amount: 0,
        description: `Faculty profile updated for ${faculty.name}: ${Object.keys(safeData).join(', ')}`,
        metadata: { fields: Object.keys(safeData) },
      })
    }

    return withToken(json(faculty), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/hr/faculty/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/hr/faculty/:id — deactivate */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params

    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    const faculty = await Faculty.findByIdAndUpdate(oid, { isActive: false }, { new: true })
    if (!faculty) return withToken(json({ error: 'Faculty not found' }, 404), refreshedToken)

    return withToken(json({ success: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/hr/faculty/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
