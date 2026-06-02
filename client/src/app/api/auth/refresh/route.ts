import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth'
import { RefreshToken, hashToken } from '@server/models/RefreshToken'

// Rate limiting: TODO — add Upstash Redis rate limiting here when configured.

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const isProduction = process.env.NODE_ENV === 'production'

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('refreshToken')?.value

    if (!raw) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    await connectDB()

    const stored = await RefreshToken.findOne({ tokenHash: hashToken(raw) })
    if (!stored) {
      return NextResponse.json({ error: 'Refresh token revoked or expired' }, { status: 401 })
    }

    const payload = verifyRefreshToken(raw)
    if (!payload) {
      // JWT verify failed — delete the stored token
      await RefreshToken.deleteOne({ tokenHash: hashToken(raw) }).catch(() => null)
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    }

    // Token rotation: delete old token, issue new one
    await RefreshToken.deleteOne({ tokenHash: hashToken(raw) })

    const newPayload = {
      userId:    payload.userId,
      role:      payload.role,
      facultyId: payload.facultyId,
      batchId:   payload.batchId,
    }

    const newRefreshToken = signRefreshToken(newPayload)
    await RefreshToken.create({
      tokenHash: hashToken(newRefreshToken),
      userId:    stored.userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    })

    // Re-stamp lastActive so the session inactivity clock resets on refresh
    const accessToken = signAccessToken(newPayload)

    const res = NextResponse.json({ accessToken })
    res.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure:   isProduction,
      sameSite: 'lax',
      path:     '/api/auth',
      maxAge:   REFRESH_TOKEN_TTL_MS / 1000,
    })

    return res
  } catch (err) {
    console.error('[POST /api/auth/refresh]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
