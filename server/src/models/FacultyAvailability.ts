import { Schema, model, Document, Types } from 'mongoose'

export type AvailabilityStatus = 'AVAILABLE' | 'RESCHEDULED' | 'CANCELLED'

export interface IFacultyAvailability extends Document {
  facultyId: Types.ObjectId
  date: Date
  status: AvailabilityStatus
  remark?: string
  loggedByUserId: Types.ObjectId
}

const FacultyAvailabilitySchema = new Schema<IFacultyAvailability>(
  {
    facultyId:      { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    date:           { type: Date, required: true },
    status:         { type: String, enum: ['AVAILABLE', 'RESCHEDULED', 'CANCELLED'], default: 'AVAILABLE' },
    remark:         String,
    loggedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

// One status entry per faculty per date
FacultyAvailabilitySchema.index({ facultyId: 1, date: 1 }, { unique: true })
FacultyAvailabilitySchema.index({ date: 1 })

export const FacultyAvailability = model<IFacultyAvailability>('FacultyAvailability', FacultyAvailabilitySchema)
