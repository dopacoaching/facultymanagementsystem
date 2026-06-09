import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { AuditLog } from '@/lib/models/AuditLog'

/** GET /api/hr/audit-log?category=&eventType=&actorRole=&targetType=&search=&from=&to=&page=&limit= */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'ADMIN', 'HR_MANAGER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    const category   = searchParams.get('category')   ?? ''
    const eventType  = searchParams.get('eventType')  ?? ''
    const actorRole  = searchParams.get('actorRole')  ?? ''
    const targetType = searchParams.get('targetType') ?? ''
    const search     = searchParams.get('search')     ?? ''
    const from       = searchParams.get('from')       ?? ''
    const to         = searchParams.get('to')         ?? ''
    const page       = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit      = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '50')))

    const filter: Record<string, unknown> = {}

    if (category  && category  !== 'ALL') filter.category  = category
    if (eventType && eventType !== 'ALL') filter.eventType = eventType
    if (actorRole && actorRole !== 'ALL') filter.actorRole = actorRole
    if (targetType && targetType !== 'ALL') filter.targetType = targetType

    // Date range
    if (from || to) {
      const ts: Record<string, Date> = {}
      if (from) ts.$gte = new Date(from)
      if (to)   ts.$lte = new Date(to + 'T23:59:59.999Z')
      filter.timestamp = ts
    }

    // Full-text search across description, targetName, actorUsername.
    // Escape regex metacharacters to prevent ReDoS.
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { description:   { $regex: escaped, $options: 'i' } },
        { targetName:    { $regex: escaped, $options: 'i' } },
        { actorUsername: { $regex: escaped, $options: 'i' } },
        { actorRole:     { $regex: escaped, $options: 'i' } },
      ]
    }

    await connectDB()

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ])

    return withToken(json({ logs, total, page, limit }), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/audit-log]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
