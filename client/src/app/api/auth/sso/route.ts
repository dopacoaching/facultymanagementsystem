import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { signAccessToken, signRefreshToken, isSameOrigin } from '@/lib/auth'
import { RefreshToken, hashToken } from '@/lib/models/RefreshToken'
import { User } from '@/lib/models/User'
import { writeAuditLog } from '@/lib/services/salary/audit'
import { ssoLimiter, getIP } from '@/lib/ratelimit'

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const isProduction = process.env.NODE_ENV === 'production'

// How long to wait on identity-service before giving up. Kept well under
// Vercel's 10s function ceiling so a hung upstream fails fast with a clear
// error instead of a bare 504.
const IDENTITY_FETCH_TIMEOUT_MS = 7000

// Additive-only SSO bridge. Called same-origin by the client-side /sso and
// /admin/sso pages (not a redirect target itself — FMS needs to seed Redux
// state, not just a cookie; see lib/useSsoBridge.ts).
//
// Exchanges the one-time code from the identity portal for an identity
// assertion, then mints tokens and writes the RefreshToken row using this
// app's own, unmodified signAccessToken/signRefreshToken/RefreshToken exactly
// as /api/auth/login and /api/auth/refresh do. identity-service never sees
// JWT_SECRET or JWT_REFRESH_SECRET. /api/auth/{login,refresh,logout} are
// untouched, and anyone not coming through the portal never hits this route.
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (ssoLimiter) {
      const ip = getIP(req)
      const { success, limit, remaining, reset } = await ssoLimiter.limit(ip)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many sign-in attempts — try again later.' },
          { status: 429, headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          }},
        )
      }
    }

    const identityServiceUrl = process.env.IDENTITY_SERVICE_URL

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { code } = (body ?? {}) as { code?: string }

    if (!code || !identityServiceUrl) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let exchangeRes: Response
    try {
      exchangeRes = await fetch(`${identityServiceUrl}/sso/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, appId: 'fms' }),
        cache: 'no-store',
        signal: AbortSignal.timeout(IDENTITY_FETCH_TIMEOUT_MS),
      })
    } catch (err) {
      console.error('[POST /api/auth/sso] identity-service unreachable', err)
      return NextResponse.json({ error: 'Identity service unavailable' }, { status: 503 })
    }
    if (!exchangeRes.ok) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    const { localUserId, appRole, snapshot } = (await exchangeRes.json()) as {
      localUserId: string
      appRole: string
      snapshot: Record<string, unknown> | null
    }

    if (!localUserId || !appRole) {
      return NextResponse.json({ error: 'Invalid identity assertion' }, { status: 502 })
    }

    const payload = {
      userId: localUserId,
      role: appRole,
      username: snapshot?.username as string | undefined,
      facultyId: snapshot?.facultyId as string | undefined,
      batchId: snapshot?.batchId as string | undefined,
      batchType: snapshot?.batchType as string | undefined,
      campusName: snapshot?.campusName as string | undefined,
      campusId: snapshot?.campusId as string | undefined,
    }

    await connectDB()

    // Re-check the local account is still active, same as /api/auth/login does —
    // the identity-service snapshot is only as fresh as the last linking run, so
    // this closes the gap where an account deactivated after linking (but whose
    // AppLink wasn't also deactivated) could otherwise still SSO in.
    const localUser = await User.findById(localUserId).select('isActive username').lean()
    if (!localUser || !localUser.isActive) {
      return NextResponse.json({ error: 'Account not found or inactive' }, { status: 401 })
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId: localUserId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    })

    writeAuditLog({
      category: 'AUTH', eventType: 'USER_LOGGED_IN',
      actorUserId: localUserId, actorRole: appRole,
      actorUsername: localUser.username ?? payload.username ?? '(sso)',
      description: `User "${localUser.username ?? localUserId}" (${appRole}) signed in via SSO`,
      metadata: { ip: getIP(req), method: 'sso' },
    }).catch(() => null)

    const res = NextResponse.json({
      accessToken,
      role: payload.role,
      userId: payload.userId,
      facultyId: payload.facultyId,
      batchId: payload.batchId,
      batchType: payload.batchType,
      campusName: payload.campusName,
      campusId: payload.campusId,
    })

    res.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_TTL_MS / 1000,
    })

    return res
  } catch (err) {
    console.error('[POST /api/auth/sso]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
