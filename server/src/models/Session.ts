import { Schema, model, Document, Types } from 'mongoose'
import { SessionStatus, CancellationInitiator } from '../types'

export interface ISession extends Document {
  facultyId: Types.ObjectId
  batchId: Types.ObjectId
  subject: string
  chapter: string
  startTime?: string          // "HH:MM" 24-hour format, e.g. "09:30"
  durationHours: number
  sessionDate: Date
  timeSlot?: 'MORNING' | 'AFTERNOON'
  status: SessionStatus
  cancellationInitiator?: CancellationInitiator
  cancellationReason?: string
  loggedByUserId: Types.ObjectId
  /** CLASS = regular teaching hours; DOUBT_CLEARANCE = doubt-clearing session.
   *  Only meaningful for faculty on the DOUBT_CLEARANCE_SPLIT_RATE contract type,
   *  who are paid a different rate per category. Defaults to CLASS for everyone else. */
  sessionCategory: 'CLASS' | 'DOUBT_CLEARANCE'
}

const SessionSchema = new Schema<ISession>(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    startTime: { type: String, match: /^\d{2}:\d{2}$/ },
    durationHours: { type: Number, required: true, min: 0.5 },
    sessionDate: { type: Date, required: true },
    timeSlot: { type: String, enum: ['MORNING', 'AFTERNOON'] },
    status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOT_COMPLETED'], default: 'SCHEDULED' },
    cancellationInitiator: { type: String, enum: ['FACULTY', 'MANAGEMENT', 'STUDENT'] },
    cancellationReason: String,
    loggedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionCategory: { type: String, enum: ['CLASS', 'DOUBT_CLEARANCE'], default: 'CLASS' },
  },
  { timestamps: true }
)

SessionSchema.index({ facultyId: 1, sessionDate: 1 })
SessionSchema.index({ batchId: 1, sessionDate: 1 })
SessionSchema.index({ facultyId: 1, batchId: 1, sessionDate: 1 })
SessionSchema.index({ status: 1, sessionDate: 1 })

export const Session = model<ISession>('Session', SessionSchema)
