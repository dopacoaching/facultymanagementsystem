import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { RefreshToken, hashToken } from '@server/models/RefreshToken'

const isProduction = process.env.NODE_ENV === 'production'

export async function POST(_req: NextRequest) {
  try {
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
