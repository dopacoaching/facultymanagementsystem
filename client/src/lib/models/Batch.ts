import { Schema, model, Document, Types } from 'mongoose'
import { BatchType } from '@/lib/types'

export interface IBatch extends Document {
  name: string
  type: BatchType
  campusId: Types.ObjectId
  ig1Subgroup?: 'PLUS_ONE' | 'PLUS_TWO'
  isActive: boolean
}

const BatchSchema = new Schema<IBatch>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['RESIDENTIAL', 'OFFLINE', 'ONLINE', 'INTEGRATED_SCHOOL'], required: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    ig1Subgroup: { type: String, enum: ['PLUS_ONE', 'PLUS_TWO'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Batch = model<IBatch>('Batch', BatchSchema)
