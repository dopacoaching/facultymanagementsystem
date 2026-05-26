import { Schema, model, Document, Types } from 'mongoose'
import { SessionStatus, CancellationInitiator } from '../types'

export interface ISession extends Document {
  facultyId: Types.ObjectId
  batchId: Types.ObjectId
  subject: string
  chapter: string
  durationHours: number
  sessionDate: Date
  timeSlot?: 'MORNING' | 'EVENING'
  status: SessionStatus
  cancellationInitiator?: CancellationInitiator
  cancellationReason?: string
  loggedByUserId: Types.ObjectId
}

const SessionSchema = new Schema<ISession>(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    durationHours: { type: Number, required: true, min: 0.5 },
    sessionDate: { type: Date, required: true },
    timeSlot: { type: String, enum: ['MORNING', 'EVENING'] },
    status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOT_COMPLETED'], default: 'SCHEDULED' },
    cancellationInitiator: { type: String, enum: ['FACULTY', 'MANAGEMENT', 'STUDENT'] },
    cancellationReason: String,
    loggedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

SessionSchema.index({ facultyId: 1, sessionDate: 1 })
SessionSchema.index({ batchId: 1, sessionDate: 1 })

export const Session = model<ISession>('Session', SessionSchema)
