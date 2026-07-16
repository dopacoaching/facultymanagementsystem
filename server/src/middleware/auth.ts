import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWTPayload } from '../types'
import { SESSION_TIMEOUT_MS } from '../controllers/auth.controller'

export interface AuthRequest extends Request {
  user?: JWTPayload
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload

    // ── Inactivity check ──────────────────────────────────────────────────────
    if (payload.lastActive !== undefined) {
      const idleMs = Date.now() - payload.lastActive
      if (idleMs > SESSION_TIMEOUT_MS) {
        res.status(401).json({ error: 'SESSION_EXPIRED' })
        return
      }
    }

    req.user = payload

    // ── Sliding-window refresh ────────────────────────────────────────────────
    // Re-sign the access token with an updated lastActive timestamp so the 30-
    // minute idle window resets on every authenticated request.
    // jwt.verify returns iat/exp — reconstruct from known custom claims only
    // so jwt.sign generates fresh iat/exp from the expiresIn option.
    const refreshedToken = jwt.sign(
      {
        userId:    payload.userId,
        role:      payload.role,
        ...(payload.facultyId != null ? { facultyId: payload.facultyId } : {}),
        ...(payload.batchId   != null ? { batchId:   payload.batchId   } : {}),
        ...(payload.batchType != null ? { batchType: payload.batchType } : {}),
        lastActive: Date.now(),
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' } as object,
    )
    res.setHeader('X-Refreshed-Token', refreshedToken)

    next()
  } catch (err) {
    // jwt.verify throws on invalid/expired token; jwt.sign throws if JWT_SECRET
    // is malformed — both produce the same 401 to the client.
    const isExpired = err instanceof Error && err.message === 'jwt expired'
    res.status(401).json({ error: isExpired ? 'Token expired' : 'Invalid or expired token' })
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
