import { Schema, model, models, Model, Document, Types } from 'mongoose'
import { BatchType } from '@/lib/types'

export interface IBatch extends Document {
  name: string
  type: BatchType
  campusId: Types.ObjectId
  ig1Subgroup?: 'PLUS_ONE' | 'PLUS_TWO'
  /** NEET or JEE stream — IG batches only */
  stream?: 'NEET' | 'JEE'
  isActive: boolean
}

const BatchSchema = new Schema<IBatch>(
  {
    name:        { type: String, required: true },
    type:        { type: String, enum: ['RESIDENTIAL', 'OFFLINE', 'ONLINE', 'IG'], required: true },
    campusId:    { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    ig1Subgroup: { type: String, enum: ['PLUS_ONE', 'PLUS_TWO'] },
    stream:      { type: String, enum: ['NEET', 'JEE'] },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Batch = (models.Batch as Model<IBatch>) ?? model<IBatch>('Batch', BatchSchema)
