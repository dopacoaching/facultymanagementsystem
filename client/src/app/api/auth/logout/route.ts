import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { RefreshToken, hashToken } from '@/lib/models/RefreshToken'
import { isSameOrigin } from '@/lib/auth'

const isProduction = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const cookieStore = await cookies()
    const raw = cookieStore.get('refreshToken')?.value

    if (raw) {
      await connectDB()
      await RefreshToken.deleteOne({ tokenHash: hashToken(raw) }).catch(() => null)
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
