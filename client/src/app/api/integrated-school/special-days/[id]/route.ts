import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { SpecialDay } from '@/lib/models/SpecialDay'

/** DELETE /api/integrated-school/special-days/:id */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IS_ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return forbidden

    const { id } = await params

    await connectDB()

    const day = await SpecialDay.findByIdAndDelete(id)
    if (!day) return withToken(json({ error: 'Special day not found' }, 404), refreshedToken)

    return withToken(json({ success: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/integrated-school/special-days/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
