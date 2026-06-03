import { Schema, model, Document, Types } from 'mongoose'

export type ISSlotStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED'
export type ISTimeSlot   = 'MORNING' | 'AFTERNOON'

export interface IISTimetableSlot extends Document {
  /** Specific calendar date for this class */
  date:          Date
  campusId:      Types.ObjectId
  batchId:       Types.ObjectId
  facultyId?:    Types.ObjectId
  subject:       string
  chapter:       string
  startTime?:    string       // "HH:MM" 24-hour format, e.g. "09:30"
  durationHours?: number      // planned duration in decimal hours
  timeSlot:      ISTimeSlot
  status:        ISSlotStatus
  notes?:        string
  /** True when this was logged after-the-fact (not pre-planned) */
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
    durationHours: { type: Number, min: 0 },
    timeSlot:      { type: String, enum: ['MORNING', 'AFTERNOON'], required: true },
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

export const ISTimetableSlot = model<IISTimetableSlot>('ISTimetableSlot', ISTimetableSlotSchema)
