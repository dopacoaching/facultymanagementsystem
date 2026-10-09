import { Schema, model, models, Model, Document, Types } from 'mongoose'

/** A campus-level "No Class" marker: the coordinator confirms nothing was taught
 *  at this campus on this day. It counts as a submitted report, so the day is
 *  not red-flagged on the HR/Admin entries report. */
export interface INoClassDay extends Document {
  campusName: string
  /** Local midnight of the day with no class. */
  date: Date
  reason?: string
  markedByUserId: Types.ObjectId
  markedByName?: string
}

const NoClassDaySchema = new Schema<INoClassDay>(
  {
    campusName:     { type: String, required: true },
    date:           { type: Date, required: true },
    reason:         { type: String, trim: true },
    markedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    markedByName:   { type: String },
  },
  { timestamps: true }
)

NoClassDaySchema.index({ campusName: 1, date: 1 }, { unique: true })

export const NoClassDay = (models.NoClassDay as Model<INoClassDay>) ?? model<INoClassDay>('NoClassDay', NoClassDaySchema)
