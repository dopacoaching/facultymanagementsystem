import { Schema, model, models, Model, Document, Types } from 'mongoose'

export type SpecialDayType =
  | 'MONDAY_EXAM'
  | 'FRIDAY_EXAM'
  | 'WEEKLY_EXAM'
  | 'TOUR'
  | 'BUFFER_DAY'
  | 'HOLIDAY'

export interface ISpecialDay extends Document {
  date:      Date
  /** null means the special day applies to ALL IS campuses */
  campusId?: Types.ObjectId
  type:      SpecialDayType
  notes?:    string
}

const SpecialDaySchema = new Schema<ISpecialDay>(
  {
    date:     { type: Date, required: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    type:     {
      type:     String,
      enum:     ['MONDAY_EXAM', 'FRIDAY_EXAM', 'WEEKLY_EXAM', 'TOUR', 'BUFFER_DAY', 'HOLIDAY'],
      required: true,
    },
    notes:    String,
  },
  { timestamps: true }
)

// Allow only one record of the same type per (campus, date)
SpecialDaySchema.index({ date: 1, campusId: 1, type: 1 }, { unique: true })
SpecialDaySchema.index({ date: 1, campusId: 1 })

export const SpecialDay = (models.SpecialDay as Model<ISpecialDay>) ?? model<ISpecialDay>('SpecialDay', SpecialDaySchema)
