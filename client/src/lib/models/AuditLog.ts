import { Schema, model, Document, Types } from 'mongoose'
import { AuditEventType } from '@/lib/types'
import { randomBytes } from 'crypto'

export interface IAuditLog extends Document {
  referenceNumber: string
  eventType: AuditEventType
  facultyId: Types.ObjectId
  facultyName: string
  amount: number
  reason: string
  cancellationInitiator?: string
  sessionId?: Types.ObjectId
  loggedByUserId: string
  timestamp: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    referenceNumber: {
      type: String,
      unique: true,
      default: () => `AL-${randomBytes(6).toString('hex').toUpperCase()}`,
    },
    eventType: {
      type: String,
      enum: [
        'PENALTY_APPLIED', 'OVERTIME_ADDED', 'BALANCE_CARRY_FORWARD',
        'SALARY_APPROVED', 'PAY_CONFIG_UPDATED', 'SALARY_FIELD_CHANGED',
        'SESSION_CANCELLED', 'FACULTY_CREATED', 'FACULTY_UPDATED',
      ],
      required: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    facultyName: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    cancellationInitiator: String,
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
    loggedByUserId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    // Append-only: disable updates via pre-hooks
  }
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

AuditLogSchema.index({ facultyId: 1, timestamp: -1 })

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema)
