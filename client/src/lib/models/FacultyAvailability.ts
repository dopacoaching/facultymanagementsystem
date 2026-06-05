import { Schema, model, models, Model, Document, Types } from 'mongoose'

export type AvailabilityStatus = 'AVAILABLE' | 'RESCHEDULED' | 'CANCELLED'

export interface IFacultyAvailability extends Document {
  facultyId:      Types.ObjectId
  date:           Date
  status:         AvailabilityStatus
  remark?:        string
  loggedByUserId: Types.ObjectId
}

const FacultyAvailabilitySchema = new Schema<IFacultyAvailability>(
  {
    facultyId:      { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    date:           { type: Date,   required: true },
    status:         { type: String, enum: ['AVAILABLE', 'RESCHEDULED', 'CANCELLED'], default: 'AVAILABLE' },
    remark:         { type: String },
    loggedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

FacultyAvailabilitySchema.index({ facultyId: 1, date: 1 }, { unique: true })
FacultyAvailabilitySchema.index({ date: 1 })

export const FacultyAvailability: Model<IFacultyAvailability> =
  models.FacultyAvailability ?? model<IFacultyAvailability>('FacultyAvailability', FacultyAvailabilitySchema)
