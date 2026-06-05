import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { authenticate, authorize, json, withToken } from '@/lib/auth'
import { SpecialDay } from '@/lib/models/SpecialDay'
import { writeAuditLog } from '@/lib/services/salary/audit'

/** DELETE /api/ig/special-days/:id */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticate(req)
    if (auth instanceof NextResponse) return auth
    const { payload, refreshedToken } = auth

    const forbidden = authorize(payload, 'IG_ACADEMICS_MANAGER', 'ADMIN')
    if (forbidden) return withToken(forbidden, refreshedToken)

    const { id } = await params

    await connectDB()

    const day = await SpecialDay.findByIdAndDelete(id)
    if (!day) return withToken(json({ error: 'Special day not found' }, 404), refreshedToken)

    writeAuditLog({
      category: 'IG', eventType: 'SPECIAL_DAY_DELETED',
      actorUserId: payload.userId, actorRole: payload.role,
      targetType: 'SpecialDay', targetId: id,
      targetName: `${day.type} on ${new Date(day.date).toDateString()}`,
      description: `Special day deleted: ${day.type} on ${new Date(day.date).toDateString()}`,
    }).catch(() => null)

    return withToken(json({ success: true }), refreshedToken)
  } catch (err) {
    console.error('[DELETE /api/ig/special-days/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
