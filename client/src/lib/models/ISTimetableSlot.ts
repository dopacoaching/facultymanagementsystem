import { Schema, model, models, Model, Document, Types } from 'mongoose'

export type ISSlotStatus  = 'PLANNED' | 'COMPLETED' | 'CANCELLED'
export type IGSessionSlot = 'SESSION_1' | 'SESSION_2' | 'SESSION_3'
export type IGSessionType = 'LIVE_SESSION' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

export interface IISTimetableSlot extends Document {
  date:          Date
  campusId:      Types.ObjectId
  batchId:       Types.ObjectId
  facultyId?:    Types.ObjectId
  subject:       string
  chapter:       string
  startTime?:    string
  durationHours?: number
  timeSlot:      IGSessionSlot
  sessionType:   IGSessionType
  status:        ISSlotStatus
  notes?:        string
  isUnplanned:   boolean
}

const ISTimetableSlotSchema = new Schema<IISTimetableSlot>(
  {
    date:          { type: Date,                                  required: true },
    campusId:      { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    batchId:       { type: Schema.Types.ObjectId, ref: 'Batch',  required: true },
    facultyId:     { type: Schema.Types.ObjectId, ref: 'Faculty' },
    subject:       { type: String, required: true },
    chapter:       { type: String, required: true },
    startTime:     { type: String, match: /^\d{2}:\d{2}$/ },
    durationHours: { type: Number },
    timeSlot:      { type: String, enum: ['SESSION_1', 'SESSION_2', 'SESSION_3'], required: true },
    sessionType:   { type: String, enum: ['LIVE_SESSION', 'WEEKLY_EXAM', 'MONTHLY_EXAM'], default: 'LIVE_SESSION' },
    status:        { type: String, enum: ['PLANNED', 'COMPLETED', 'CANCELLED'], default: 'PLANNED' },
    notes:         String,
    isUnplanned:   { type: Boolean, default: false },
  },
  { timestamps: true }
)

// One class per batch per time slot per day
ISTimetableSlotSchema.index({ batchId: 1, date: 1, timeSlot: 1 }, { unique: true })
// Conflict-check: faculty at campus/date/slot
ISTimetableSlotSchema.index({ campusId: 1, date: 1, timeSlot: 1 })
// Faculty schedule lookup
ISTimetableSlotSchema.index({ facultyId: 1, date: 1 })

export const ISTimetableSlot = (models.ISTimetableSlot as Model<IISTimetableSlot>) ?? model<IISTimetableSlot>('ISTimetableSlot', ISTimetableSlotSchema)
