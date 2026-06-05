import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { signAccessToken, signRefreshToken, verifyRefreshToken, isSameOrigin } from '@/lib/auth'
import { RefreshToken, hashToken } from '@/lib/models/RefreshToken'
import { refreshLimiter, getIP } from '@/lib/ratelimit'

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const isProduction = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (refreshLimiter) {
      const ip = getIP(req)
      const { success } = await refreshLimiter.limit(ip)
      if (!success) {
        return NextResponse.json({ error: 'Too many requests — slow down.' }, { status: 429 })
      }
    }

    const cookieStore = await cookies()
    const raw = cookieStore.get('refreshToken')?.value

    if (!raw) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    await connectDB()

    const rawHash = hashToken(raw)

    const stored = await RefreshToken.findOne({ tokenHash: rawHash })
    if (!stored) {
      return NextResponse.json({ error: 'Refresh token revoked or expired' }, { status: 401 })
    }

    const payload = verifyRefreshToken(raw)
    if (!payload) {
      // JWT verify failed — delete the stored token
      await RefreshToken.deleteOne({ tokenHash: rawHash }).catch(() => null)
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    }

    // Token rotation: expire old token after a 30-second grace period instead of
    // deleting it immediately. This prevents concurrent requests from multiple
    // browser tabs racing on the same refresh token — the second tab arrives
    // within the grace window, finds the old token, and gets a fresh access token.
    // The TTL index cleans up the old document automatically.
    await RefreshToken.findOneAndUpdate(
      { tokenHash: rawHash },
      { expiresAt: new Date(Date.now() + 30_000) },
    )

    const newPayload = {
      userId:    payload.userId,
      role:      payload.role,
      facultyId: payload.facultyId,
      batchId:   payload.batchId,
      batchType: payload.batchType,
    }

    const newRefreshToken = signRefreshToken(newPayload)
    try {
      await RefreshToken.create({
        tokenHash: hashToken(newRefreshToken),
        userId:    stored.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      })
    } catch (e: unknown) {
      // E11000: a concurrent refresh (same second, same payload) already created this token.
      // Both requests get the same new access token — safe to continue.
      if ((e as { code?: number }).code !== 11000) throw e
    }

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
