import { Schema, model, Model, Document, Types } from 'mongoose'
import { AuditEventType, AuditCategory } from '../types'
import { randomBytes } from 'crypto'

export interface IAuditLog extends Document {
  referenceNumber: string

  // Grouping
  category: AuditCategory
  eventType: AuditEventType

  // Who did it
  actorUserId: string     // JWT userId
  actorRole: string       // JWT role
  actorUsername?: string  // stored when available (e.g. login)

  // What was affected
  targetType?: string     // 'Faculty' | 'Session' | 'Schedule' | 'Chapter' | 'User' | 'Timetable' | 'SpecialDay'
  targetId?: string       // _id as string
  targetName?: string     // human-readable label

  // Description
  description: string

  // Optional structured detail (field changes, metadata)
  metadata?: Record<string, unknown>

  // Legacy HR-specific fields (kept for backward compat, now optional)
  facultyId?: Types.ObjectId
  facultyName?: string
  amount?: number
  cancellationInitiator?: string
  sessionId?: Types.ObjectId

  // Kept for backward compat — aliased from actorUserId
  loggedByUserId: string
  timestamp: Date
}

const ALL_EVENT_TYPES: AuditEventType[] = [
  'FACULTY_CREATED','FACULTY_UPDATED','PAY_CONFIG_UPDATED',
  'SALARY_APPROVED','SALARY_FIELD_CHANGED','PENALTY_APPLIED',
  'OVERTIME_ADDED','BALANCE_CARRY_FORWARD',
  'SESSION_LOGGED','SESSION_UPDATED','SESSION_STATUS_CHANGED','SESSION_CANCELLED',
  'CHAPTER_UPDATED','SCHEDULE_CREATED','SCHEDULE_UPDATED',
  'SCHEDULE_PUBLISHED','SCHEDULE_REVISED','SCHEDULE_DELETED',
  'IG_SESSION_LOGGED','IG_SESSION_STATUS_CHANGED','IG_SESSION_CANCELLED',
  'IG_CHAPTER_UPDATED','IG_TIMETABLE_ASSIGNED','IG_TIMETABLE_UPDATED','IG_TIMETABLE_DELETED',
  'SPECIAL_DAY_ADDED','SPECIAL_DAY_DELETED',
  'USER_ACCOUNT_CREATED','USER_ACCOUNT_UPDATED',
  'USER_LOGGED_IN','USER_LOGGED_OUT','PASSWORD_CHANGED',
]

const AuditLogSchema = new Schema<IAuditLog>(
  {
    referenceNumber: {
      type: String,
      unique: true,
      default: () => `AL-${randomBytes(6).toString('hex').toUpperCase()}`,
    },
    category:    { type: String, enum: ['HR','ACADEMICS','IG','ADMIN','AUTH'], required: true },
    eventType:   { type: String, enum: ALL_EVENT_TYPES, required: true },

    actorUserId:   { type: String, required: true },
    actorRole:     { type: String, required: true },
    actorUsername: { type: String },

    targetType:  { type: String },
    targetId:    { type: String },
    targetName:  { type: String },

    description: { type: String, required: true },
    metadata:    { type: Schema.Types.Mixed },

    // Legacy (backward compat)
    facultyId:             { type: Schema.Types.ObjectId, ref: 'Faculty' },
    facultyName:           { type: String },
    amount:                { type: Number, default: 0 },
    cancellationInitiator: { type: String },
    sessionId:             { type: Schema.Types.ObjectId, ref: 'Session' },

    loggedByUserId: { type: String, required: true },
    timestamp:      { type: Date, default: Date.now },
  },
  {}
)

// Append-only guards — never allow updates or deletes on audit records
AuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('AuditLog is append-only. Updates are not allowed.')
})
AuditLogSchema.pre('updateOne', function () {
  throw new Error('AuditLog is append-only. Updates are not allowed.')
})
AuditLogSchema.pre('updateMany', function () {
  throw new Error('AuditLog is append-only. Updates are not allowed.')
})
AuditLogSchema.pre('deleteOne', function () {
  throw new Error('AuditLog is append-only. Deletes are not allowed.')
})
AuditLogSchema.pre('deleteMany', function () {
  throw new Error('AuditLog is append-only. Deletes are not allowed.')
})
AuditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('AuditLog is append-only. Deletes are not allowed.')
})

AuditLogSchema.index({ timestamp: -1 })
AuditLogSchema.index({ category: 1, timestamp: -1 })
AuditLogSchema.index({ eventType: 1, timestamp: -1 })
AuditLogSchema.index({ actorUserId: 1, timestamp: -1 })
AuditLogSchema.index({ actorRole: 1, timestamp: -1 })
AuditLogSchema.index({ targetType: 1, targetId: 1 })
// legacy
AuditLogSchema.index({ facultyId: 1, timestamp: -1 })
AuditLogSchema.index({ loggedByUserId: 1, timestamp: -1 })

export const AuditLog: Model<IAuditLog> = model<IAuditLog>('AuditLog', AuditLogSchema)
