import { Schema, model, Document, Types } from 'mongoose'
import { createHash } from 'crypto'

export interface IRefreshToken extends Document {
  tokenHash: string        // SHA-256 of the raw refresh token
  userId:    Types.ObjectId
  expiresAt: Date
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  tokenHash: { type: String, required: true, unique: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
})

// TTL index: MongoDB will automatically delete expired documents.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
RefreshTokenSchema.index({ userId: 1 })

export const RefreshToken = model<IRefreshToken>('RefreshToken', RefreshTokenSchema)

/** Hash a raw JWT string before storing or looking up. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
