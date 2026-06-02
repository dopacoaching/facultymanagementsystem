import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { AuditLog } from '@/lib/models/AuditLog'

/** GET /api/hr/audit-log?facultyId=&eventType=&page=&limit= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ADMIN')
    if (forbidden) return forbidden

    const { searchParams } = new URL(req.url)
    const facultyId = searchParams.get('facultyId')
    const eventType = searchParams.get('eventType')
    const page      = searchParams.get('page')  ?? '1'
    const limit     = searchParams.get('limit') ?? '50'

    const filter: Record<string, unknown> = {}

    if (facultyId) {
      try { filter.facultyId = new Types.ObjectId(facultyId) } catch {
        return withToken(json({ error: 'Invalid facultyId' }, 400), refreshedToken)
      }
    }
    if (eventType && eventType !== 'ALL') {
      filter.eventType = eventType
    }

    const p = Math.max(1, Number(page))
    const l = Math.min(100, Math.max(1, Number(limit)))

    await connectDB()

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip((p - 1) * l).limit(l),
      AuditLog.countDocuments(filter),
    ])

    return withToken(json({ logs, total, page: p, limit: l }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/audit-log]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
