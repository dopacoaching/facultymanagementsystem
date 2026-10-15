import { Schema, model, models, Model, Document, Types } from 'mongoose'

/** A "No Class" marker: the coordinator confirms nothing was taught at this campus
 *  (or, with batchIds, for just those batches) on this day. It counts as a submitted report, so the day is
 *  not red-flagged on the HR/Admin entries report. */
export interface INoClassDay extends Document {
  campusName: string
  /** Local midnight of the day with no class. */
  date: Date
  reason?: string
  /** Campuses with several batches: only these batches had no class. Empty/absent = the whole campus. */
  batchIds?: Types.ObjectId[]
  markedByUserId: Types.ObjectId
  markedByName?: string
}

const NoClassDaySchema = new Schema<INoClassDay>(
  {
    campusName:     { type: String, required: true },
    date:           { type: Date, required: true },
    reason:         { type: String, trim: true },
    batchIds:       { type: [{ type: Schema.Types.ObjectId, ref: 'Batch' }], default: undefined },
    markedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    markedByName:   { type: String },
  },
  { timestamps: true }
)

// Not unique: one day may carry several batch-level markers (each with its own reason).
// The API keeps a batch in at most one marker per day.
NoClassDaySchema.index({ campusName: 1, date: 1 })

export const NoClassDay = (models.NoClassDay as Model<INoClassDay>) ?? model<INoClassDay>('NoClassDay', NoClassDaySchema)
