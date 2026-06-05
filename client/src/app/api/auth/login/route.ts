import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { signAccessToken, signRefreshToken, isSameOrigin } from '@/lib/auth'
import { User } from '@/lib/models/User'
import { RefreshToken, hashToken } from '@/lib/models/RefreshToken'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { loginLimiter, getIP } from '@/lib/ratelimit'

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

const isProduction = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (loginLimiter) {
      const ip = getIP(req)
      const { success, limit, remaining, reset } = await loginLimiter.limit(ip)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many login attempts — try again in 15 minutes.' },
          { status: 429, headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          }},
        )
      }
    }

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
      userId:    user._id.toString(),
      role:      user.role,
      facultyId: user.facultyId?.toString(),
      batchId:   user.batchId?.toString(),
      batchType: user.batchType,
    }

    const accessToken  = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    // Store hash of refresh token so it can be revoked on logout
    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId:    user._id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    })

    writeAuditLog({
      category: 'AUTH', eventType: 'USER_LOGGED_IN',
      actorUserId: user._id.toString(), actorRole: user.role,
      actorUsername: user.username,
      description: `User "${user.username}" (${user.role}) signed in`,
      metadata: { ip: req.headers.get('x-forwarded-for') ?? 'unknown' },
    }).catch(() => null)

    const res = NextResponse.json({
      accessToken,
      role:      payload.role,
      userId:    payload.userId,
      facultyId: payload.facultyId,
      batchId:   payload.batchId,
      batchType: payload.batchType,
    })

    res.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   isProduction,
      sameSite: 'lax',
      path:     '/api/auth',
      maxAge:   REFRESH_TOKEN_TTL_MS / 1000,
    })

    return res
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
