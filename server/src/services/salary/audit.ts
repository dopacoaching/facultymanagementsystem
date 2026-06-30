import { Types } from 'mongoose'
import { AuditLog } from '../../models/AuditLog'
import type { AuditEventType, AuditCategory } from '../../types'

export interface AuditInput {
  // Grouping
  category: AuditCategory
  eventType: AuditEventType

  // Who did it (from JWT payload)
  actorUserId: string
  actorRole: string
  actorUsername?: string

  // What was affected
  targetType?: string
  targetId?: string
  targetName?: string

  // Human-readable description
  description: string

  // Optional structured metadata (field changes, IDs, etc.)
  metadata?: Record<string, unknown>

  // Legacy HR-specific (still accepted for backward compat)
  facultyId?: Types.ObjectId | string
  facultyName?: string
  amount?: number
  cancellationInitiator?: string
  sessionId?: Types.ObjectId | string
}

// APPEND ONLY — never call AuditLog.findOneAndUpdate() or AuditLog.deleteOne()
export async function writeAuditLog(input: AuditInput): Promise<void> {
  await AuditLog.create({
    category:    input.category,
    eventType:   input.eventType,
    actorUserId: input.actorUserId,
    actorRole:   input.actorRole,
    actorUsername: input.actorUsername,
    targetType:  input.targetType,
    targetId:    input.targetId,
    targetName:  input.targetName,
    description: input.description,
    metadata:    input.metadata,
    // legacy fields
    facultyId:   input.facultyId,
    facultyName: input.facultyName ?? input.targetName,
    amount:      input.amount ?? 0,
    cancellationInitiator: input.cancellationInitiator,
    sessionId:   input.sessionId,
    loggedByUserId: input.actorUserId,
  })
}
