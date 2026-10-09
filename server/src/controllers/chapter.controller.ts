import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { BatchChapter } from '../models/BatchChapter'
import { asyncHandler } from '../utils/asyncHandler'
import { Types } from 'mongoose'

// ─── Chapters ─────────────────────────────────────────────────────────────────

export const getChapters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId, subject } = req.query
  const filter: Record<string, unknown> = {}
  if (batchId) {
    try { filter.batchId = new Types.ObjectId(batchId as string) } catch {}
  }
  if (subject) filter.subject = subject
  const chapters = await BatchChapter.find(filter).sort({ subject: 1, chapterOrder: 1 })
  res.json(chapters)
})
