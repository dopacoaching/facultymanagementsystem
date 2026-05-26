import { Types } from 'mongoose'
import { AuditLog } from '../../models/AuditLog'
import { AuditEventType } from '../../types'

interface AuditInput {
  eventType: AuditEventType
  facultyId: Types.ObjectId | string
  facultyName: string
  amount: number
  reason: string
  cancellationInitiator?: string
  sessionId?: Types.ObjectId | string
  loggedByUserId: string
}

// APPEND ONLY — never call AuditLog.findOneAndUpdate() or AuditLog.deleteOne()
export async function writeAuditLog(input: AuditInput): Promise<void> {
  await AuditLog.create(input)
}
