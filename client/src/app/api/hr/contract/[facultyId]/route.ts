import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { Faculty } from '@/lib/models/Faculty'
import { PermanentFacultyContract } from '@/lib/models/PermanentFacultyContract'
import { writeAuditLog } from '@/lib/services/salary/audit'

const CONTRACT_WRITABLE = [
  'hourlyRate', 'fixedMonthlySalary', 'monthlyHourQuota', 'hasCarryForward',
  'minDaysNormal', 'minDaysDryMonths', 'dryMonths', 'monthlyLeaveAllowance',
  'aprilLeaveAllowance', 'overtimeThresholdHours', 'overtimeRatePerHour',
  'fixedComponent', 'variableComponent', 'cancellationPenaltyPerClass',
  'minHoursRequirement', 'isConfigured', 'configurablePayJson', 'notes',
] as const

/** GET /api/hr/contract/:facultyId */
export async function GET(req: NextRequest, { params }: { params: Promise<{ facultyId: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { facultyId } = await params

    let fid: Types.ObjectId
    try { fid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    await connectDB()

    const contract = await PermanentFacultyContract.findOne({ facultyId: fid })
    if (!contract) {
      return withToken(json({ error: 'No contract found for this faculty' }, 404), refreshedToken)
    }

    return withToken(json(contract), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/contract/:facultyId]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH /api/hr/contract/:facultyId */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ facultyId: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'HR_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { facultyId } = await params

    let fid: Types.ObjectId
    try { fid = new Types.ObjectId(facultyId) } catch {
      return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
    }

    const body = await req.json() as Record<string, unknown>

    // Build update from whitelisted fields only
    const safeUpdate: Record<string, unknown> = {}
    for (const key of CONTRACT_WRITABLE) {
      if (body[key] !== undefined) safeUpdate[key] = body[key]
    }

    if (Object.keys(safeUpdate).length === 0) {
      return withToken(json({ error: 'No valid contract fields provided' }, 400), refreshedToken)
    }

    await connectDB()

    const contract = await PermanentFacultyContract.findOneAndUpdate(
      { facultyId: fid },
      { $set: safeUpdate },
      { new: true, runValidators: true },
    )
    if (!contract) {
      return withToken(json({ error: 'No contract found for this faculty' }, 404), refreshedToken)
    }

    const faculty = await Faculty.findById(fid)
    await writeAuditLog({
      eventType:   'PAY_CONFIG_UPDATED',
      facultyId:   fid.toString(),
      facultyName: faculty?.name ?? 'Unknown',
      amount:      0,
      reason:      `Contract updated (${Object.keys(safeUpdate).join(', ')})`,
      loggedByUserId: payload.userId,
    })

    return withToken(json(contract), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/hr/contract/:facultyId]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
