import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@server/models/Faculty'
import { writeAuditLog } from '@server/services/salary/audit'
import type { FacultyType, SalaryModel } from '@server/types'

const FACULTY_WRITABLE = [
  'name', 'subject', 'type', 'salaryModel', 'isActive',
  'hourlyRate', 'fixedMonthlySalary', 'monthlyHourQuota', 'monthlyDayQuota',
  'overtimeThreshold', 'overtimeRate', 'fixedComponent', 'variableComponent',
  'totalContractDays', 'monthlyLeaveAllowance', 'aprilLeaveAllowance',
  'minDaysNormal', 'minDaysDryMonth', 'configurablePayJson',
] as const

function pickFacultyFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of FACULTY_WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  return out
}

/** GET /api/hr/faculty — list all faculty */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    await connectDB()

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('includeInactive')
    const filter = includeInactive === 'true' ? {} : { isActive: true }

    const faculty = await Faculty.find(filter).sort({ name: 1 })
    return withToken(json(faculty), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/faculty]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/hr/faculty — create faculty */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const body = await req.json() as { name?: string; subject?: string; type?: FacultyType; salaryModel?: SalaryModel } & Record<string, unknown>

    if (!body.name?.trim())    return withToken(json({ error: 'name is required' }, 400), refreshedToken)
    if (!body.subject?.trim()) return withToken(json({ error: 'subject is required' }, 400), refreshedToken)
    if (!body.type)            return withToken(json({ error: 'type is required' }, 400), refreshedToken)
    if (!body.salaryModel)     return withToken(json({ error: 'salaryModel is required' }, 400), refreshedToken)

    await connectDB()

    const safeData = pickFacultyFields(body)
    const faculty = await Faculty.create(safeData)

    await writeAuditLog({
      eventType: 'FACULTY_CREATED',
      facultyId: faculty._id.toString(),
      facultyName: faculty.name,
      amount: 0,
      reason: 'Faculty profile created',
      loggedByUserId: payload.userId,
    })

    return withToken(json(faculty, 201), refreshedToken)
  } catch (err) {
    console.error('[POST /api/hr/faculty]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
