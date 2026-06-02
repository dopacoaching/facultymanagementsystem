import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export interface JWTPayload {
  userId: string
  role: string
  facultyId?: string
  batchId?: string
  lastActive?: number
  iat?: number
  exp?: number
}

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000

export function verifyAccessToken(authHeader: string | null): JWTPayload | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    if (payload.lastActive !== undefined && Date.now() - payload.lastActive > SESSION_TIMEOUT_MS) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'lastActive'>): string {
  return jwt.sign(
    { ...payload, lastActive: Date.now() },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' } as object
  )
}

export function signRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'lastActive'>): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  } as object)
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload
  } catch {
    return null
  }
}

/** Authenticate a Next.js API route. Returns payload or a 401 Response. */
export function authenticate(req: Request): { payload: JWTPayload; refreshedToken: string } | NextResponse {
  const payload = verifyAccessToken(req.headers.get('authorization'))
  if (!payload) return json({ error: 'Unauthorized' }, 401)
  const refreshedToken = signAccessToken({
    userId: payload.userId,
    role: payload.role,
    ...(payload.facultyId ? { facultyId: payload.facultyId } : {}),
    ...(payload.batchId   ? { batchId:   payload.batchId   } : {}),
  })
  return { payload, refreshedToken }
}

/** Authorize: check role after authenticate. */
export function authorize(payload: JWTPayload, ...roles: string[]): NextResponse | null {
  if (!roles.includes(payload.role)) return json({ error: 'Forbidden' }, 403)
  return null
}

export function json(body: unknown, status = 200, headers?: Record<string, string>): NextResponse {
  const res = NextResponse.json(body, { status })
  if (headers) Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export function withToken(res: NextResponse, token: string): NextResponse {
  res.headers.set('X-Refreshed-Token', token)
  return res
}

/**
 * CSRF check: verify the request Origin matches the server host.
 * Prevents cross-site requests from triggering cookie-bearing mutations.
 * Absent Origin (curl, server-to-server) is allowed.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  const host = req.headers.get('host')
  try { return new URL(origin).host === host } catch { return false }
}
