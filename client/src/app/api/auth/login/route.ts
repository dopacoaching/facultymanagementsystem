import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { signAccessToken, signRefreshToken } from '@/lib/auth'
import { User } from '@server/models/User'
import { RefreshToken, hashToken } from '@server/models/RefreshToken'

// Rate limiting: TODO — add Upstash Redis rate limiting here when configured.

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

const isProduction = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'username and password required' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({
      username: String(username).trim().toLowerCase(),
      isActive: true,
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      facultyId: user.facultyId?.toString(),
      batchId: user.batchId?.toString(),
    }

    const accessToken  = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    // Store hash of refresh token so it can be revoked on logout
    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId:    user._id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    })

    const res = NextResponse.json({
      accessToken,
      role:      payload.role,
      userId:    payload.userId,
      facultyId: payload.facultyId,
      batchId:   payload.batchId,
    })

    res.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path:     '/api/auth',
      maxAge:   REFRESH_TOKEN_TTL_MS / 1000,
    })

    return res
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
