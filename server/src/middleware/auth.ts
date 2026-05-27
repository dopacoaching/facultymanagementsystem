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
    // If lastActive is present and the gap exceeds SESSION_TIMEOUT_MS → force
    // re-login. We do NOT attempt a refresh here — the client must redirect to
    // /login?reason=session_expired to notify the user.
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
    // minute idle window resets on every authenticated request.  The new token
    // is sent in a response header; the client should silently swap it into the
    // Redux store so the next request uses the fresh token.
    //
    // IMPORTANT: jwt.verify returns the decoded payload including the standard
    // JWT claims `iat` and `exp`.  Spreading that payload into jwt.sign while
    // also passing `expiresIn` causes jsonwebtoken to throw
    // "Bad options.expiresIn — payload already has exp property".
    // We therefore reconstruct the payload from known custom claims only so
    // that jwt.sign generates fresh iat/exp from the expiresIn option.
    const refreshedToken = jwt.sign(
      {
        userId:    payload.userId,
        role:      payload.role,
        ...(payload.facultyId != null ? { facultyId: payload.facultyId } : {}),
        ...(payload.batchId   != null ? { batchId:   payload.batchId   } : {}),
        lastActive: Date.now(),
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' } as object,
    )
    res.setHeader('X-Refreshed-Token', refreshedToken)

    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
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
