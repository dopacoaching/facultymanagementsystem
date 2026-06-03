import { Schema, model, models, Model, Document, Types } from 'mongoose'

/** A single class entry for a non-exam day (Tue / Wed / Thu) */
export interface IClassEntry {
  day: 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
  subject: string
  chapter: string
  /** Planned duration in hours — set by Academics Manager when building the schedule */
  durationHours?: number
  facultyId?: Types.ObjectId
  notes?: string
}

export interface IWeeklySchedule extends Document {
  batchId: Types.ObjectId
  /** Always a Saturday */
  weekStartDate: Date
  /** Always the following Friday (weekStartDate + 6 days) */
  weekEndDate: Date
  /** Monday exam topic — null = pending */
  mondayExamTopic?: string
  /** Friday exam topic — null = pending */
  fridayExamTopic?: string
  /** Class entries for Tue / Wed / Thu (exam days are fixed; Sat/Sun are prep days) */
  classEntries: IClassEntry[]
  isPublished: boolean
  publishedAt?: Date
  /** true if this is a revised replacement of a previously published schedule */
  isRevised: boolean
  /** ID of the schedule this revision replaces */
  replacesScheduleId?: Types.ObjectId
}

const ClassEntrySchema = new Schema<IClassEntry>(
  {
    day:          { type: String, enum: ['TUESDAY', 'WEDNESDAY', 'THURSDAY'], required: true },
    subject:      { type: String, required: true },
    chapter:      { type: String, required: true },
    durationHours:{ type: Number },
    facultyId:    { type: Schema.Types.ObjectId, ref: 'Faculty' },
    notes:        String,
  },
  { _id: false }
)

const WeeklyScheduleSchema = new Schema<IWeeklySchedule>(
  {
    batchId:             { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    weekStartDate:       { type: Date, required: true },
    weekEndDate:         { type: Date, required: true },
    mondayExamTopic:     String,
    fridayExamTopic:     String,
    classEntries:        { type: [ClassEntrySchema], default: [] },
    isPublished:         { type: Boolean, default: false },
    publishedAt:         Date,
    isRevised:           { type: Boolean, default: false },
    replacesScheduleId:  { type: Schema.Types.ObjectId, ref: 'WeeklySchedule' },
  },
  { timestamps: true }
)

// Allow one non-revised (original) AND one revised draft per (batchId, weekStartDate).
// Uniqueness is enforced at the (batchId, weekStartDate, isRevised) level.
WeeklyScheduleSchema.index({ batchId: 1, weekStartDate: 1, isRevised: 1 }, { unique: true })

export const WeeklySchedule = (models.WeeklySchedule as Model<IWeeklySchedule>) ?? model<IWeeklySchedule>('WeeklySchedule', WeeklyScheduleSchema)
