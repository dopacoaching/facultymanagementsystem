import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, json, withToken } from '@/lib/auth'
import { Batch } from '@/lib/models/Batch'

/** GET /api/hr/batches — all active batches */
export async function GET(req: NextRequest) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    await connectDB()

    const batches = await Batch.find({ isActive: true })
      .populate('campusId', 'name location')
      .sort({ name: 1 })

    return withToken(json(batches), refreshedToken)
  } catch (err) {
    console.error('[GET /api/hr/batches]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
