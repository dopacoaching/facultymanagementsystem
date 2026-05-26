import { Schema, model, Document, Types } from 'mongoose'

export interface IISTimetableSlot extends Document {
  batchId: Types.ObjectId
  campusId?: Types.ObjectId
  facultyId?: Types.ObjectId
  dayOfWeek: number          // 0=Sun … 6=Sat
  subject: string
  startTime: string          // 'HH:MM'
  endTime: string            // 'HH:MM'
  isActive: boolean
}

const ISTimetableSlotSchema = new Schema<IISTimetableSlot>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    subject: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ISTimetableSlotSchema.index({ batchId: 1, dayOfWeek: 1, startTime: 1 }, { unique: true })
ISTimetableSlotSchema.index({ campusId: 1, dayOfWeek: 1 })

export const ISTimetableSlot = model<IISTimetableSlot>('ISTimetableSlot', ISTimetableSlotSchema)
