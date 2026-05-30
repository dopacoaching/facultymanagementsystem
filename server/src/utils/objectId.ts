import { Types } from 'mongoose'
import { Response } from 'express'

/**
 * Attempts to parse `id` as a MongoDB ObjectId.
 * On failure, responds with 400 and returns null.
 * Callers must `return` immediately when this function returns null.
 *
 * Accepts `string | string[] | undefined` to handle Express's ParamsDictionary
 * typing; if an array is provided, the first element is used.
 */
export function validateObjectId(
  id: string | string[] | undefined,
  fieldName: string,
  res: Response,
): Types.ObjectId | null {
  const raw = Array.isArray(id) ? id[0] : id
  if (!raw) {
    res.status(400).json({ error: `${fieldName} is required` })
    return null
  }
  try {
    return new Types.ObjectId(raw)
  } catch {
    res.status(400).json({ error: `Invalid ${fieldName}` })
    return null
  }
}
