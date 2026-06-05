import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { FacultyAvailability } from '@/lib/models/FacultyAvailability'

const ALLOWED_ROLES = ['ACADEMICS_MANAGER', 'IG_ACADEMICS_MANAGER', 'ADMIN'] as const

/** PATCH /api/academics/availability/[id] */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, ...ALLOWED_ROLES)
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid id' }, 400), refreshedToken)
    }

    const { status, remark } = await req.json() as { status?: string; remark?: string }

    const VALID = ['AVAILABLE', 'RESCHEDULED', 'CANCELLED']
    if (!status || !VALID.includes(status)) {
      return withToken(json({ error: 'status must be AVAILABLE, RESCHEDULED, or CANCELLED' }, 400), refreshedToken)
    }

    if (status !== 'AVAILABLE' && remark !== undefined && !remark.trim()) {
      return withToken(json({ error: 'A remark is required when status is RESCHEDULED or CANCELLED' }, 400), refreshedToken)
    }

    await connectDB()

    const update: Record<string, unknown> = { status }
    if (remark !== undefined) update.remark = remark

    const entry = await FacultyAvailability.findByIdAndUpdate(oid, update, { new: true, runValidators: true })
    if (!entry) return withToken(json({ error: 'Entry not found' }, 404), refreshedToken)

    return withToken(json(entry), refreshedToken)
  } catch (err) {
    console.error('[PATCH /api/academics/availability/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/academics/availability/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, ...ALLOWED_ROLES)
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params
    let oid: Types.ObjectId
    try { oid = new Types.ObjectId(id) } catch {
      return withToken(json({ error: 'Invalid id' }, 400), refreshedToken)
    }

    await connectDB()

    const entry = await FacultyAvailability.findByIdAndDelete(oid)
    if (!entry) return withToken(json({ error: 'Entry not found' }, 404), refreshedToken)

    return withToken(json({ success: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/academics/availability/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
