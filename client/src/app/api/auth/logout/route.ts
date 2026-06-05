import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { RefreshToken, hashToken } from '@/lib/models/RefreshToken'
import { isSameOrigin, authenticate } from '@/lib/auth'
import { writeAuditLog } from '@/lib/services/salary/audit'

const isProduction = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const cookieStore = await cookies()
    const raw = cookieStore.get('refreshToken')?.value

    // Capture actor info before clearing
    const authResult = authenticate(req)
    const actor = !(authResult instanceof NextResponse) ? authResult.payload : null

    if (raw) {
      await connectDB()
      await RefreshToken.deleteOne({ tokenHash: hashToken(raw) }).catch(() => null)
    }

    if (actor) {
      writeAuditLog({
        category: 'AUTH', eventType: 'USER_LOGGED_OUT',
        actorUserId: actor.userId, actorRole: actor.role,
        description: `User (${actor.role}) signed out`,
      }).catch(() => null)
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure:   isProduction,
      sameSite: 'lax',
      path:     '/api/auth',
      maxAge:   0,
    })

    return res
  } catch (err) {
    console.error('[POST /api/auth/logout]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
