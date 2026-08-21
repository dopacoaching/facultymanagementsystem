import { Schema, model, Document, Types } from 'mongoose'
import { SessionStatus, CancellationInitiator } from '../types'

export interface ISession extends Document {
  facultyId: Types.ObjectId
  /** Legacy Repeaters/IG scheduling flow only. The campus-login class-teacher flow
   *  uses campusName instead — the two are mutually exclusive per session. */
  batchId?: Types.ObjectId
  /** Campus-login class-teacher flow only — a fixed campus name, independent of Batch. */
  campusName?: string
  classMode?: 'ONLINE' | 'OFFLINE' | 'ONLINE_DOUBT_CLEARANCE' | 'OFFLINE_DOUBT_CLEARANCE'
  subject: string
  chapter?: string
  /** What time the class was supposed to start, for lateness tracking. HR/Admin-only visibility. */
  scheduledTime?: string
  /** The person (from the campus's teacher list) who actually filled in this entry. */
  updatedByName?: string
  startTime?: string          // "HH:MM" 24-hour format, e.g. "09:30"
  endTime?: string
  /** Raw break length as entered — the first 15 minutes are free; only the excess
   *  is deducted from durationHours. Kept for audit/display, not itself the deduction. */
  breakMinutes?: number
  durationHours: number
  sessionDate: Date
  timeSlot?: 'MORNING' | 'AFTERNOON' | 'SESSION_1' | 'SESSION_2' | 'SESSION_3'
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
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    campusName: { type: String },
    classMode: { type: String, enum: ['ONLINE', 'OFFLINE', 'ONLINE_DOUBT_CLEARANCE', 'OFFLINE_DOUBT_CLEARANCE'] },
    subject: { type: String, required: true },
    chapter: { type: String },
    scheduledTime: { type: String, match: /^\d{2}:\d{2}$/ },
    updatedByName: { type: String },
    startTime: { type: String, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, match: /^\d{2}:\d{2}$/ },
    breakMinutes: { type: Number, min: 0 },
    durationHours: { type: Number, required: true, min: 0.5 },
    sessionDate: { type: Date, required: true },
    timeSlot: { type: String, enum: ['MORNING', 'AFTERNOON', 'SESSION_1', 'SESSION_2', 'SESSION_3'] },
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
SessionSchema.index({ campusName: 1, sessionDate: 1 })
SessionSchema.index({ facultyId: 1, campusName: 1, sessionDate: 1 })

export const Session = model<ISession>('Session', SessionSchema)
