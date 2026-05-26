import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'

type AsyncRouteHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void>

/**
 * Wraps an async Express route handler so that any unhandled promise rejection
 * is forwarded to the Express global error handler instead of crashing the process.
 *
 * Express 4 does NOT catch async errors automatically — this utility bridges that gap.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req as AuthRequest, res, next).catch(next)
  }
}
