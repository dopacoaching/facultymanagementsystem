import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { Campus } from '@/lib/models/Campus'

/** GET /api/hr/campuses — all active campuses */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { refreshedToken } = auth

    await connectDB()

    const campuses = await Campus.find({ isActive: true })
      .select('name location')
      .sort({ name: 1 })

    return withToken(json(campuses), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/campuses]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
