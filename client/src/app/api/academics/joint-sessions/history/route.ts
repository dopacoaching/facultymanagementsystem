import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { listJointHistory } from '@/lib/utils/jointHistory'

/** GET /api/academics/joint-sessions/history?from=&to= — every repeaters joint class, for the joint-entry login. */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'REPEATERS_JOINT_TEACHER')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { searchParams } = new URL(req.url)
    await connectDB()
    const rows = await listJointHistory('REPEATERS', searchParams.get('from'), searchParams.get('to'))
    if (!rows) return withToken(json({ error: 'from and to must be YYYY-MM-DD dates' }, 400), refreshedToken)
    return withToken(json(rows), refreshedToken)
  } catch (err) {
    console.error('[GET /api/academics/joint-sessions/history]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
