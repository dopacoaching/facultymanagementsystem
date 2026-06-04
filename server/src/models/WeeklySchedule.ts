import { Schema, model, Document, Types } from 'mongoose'

export type ClassEntryDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type ClassSessionType = 'LIVE_SESSION' | 'RECORDED_VIDEO'

/** A single class entry for any day of the week */
export interface IClassEntry {
  day: ClassEntryDay
  subject: string
  chapter: string
  /** LIVE_SESSION = in-person/live class; RECORDED_VIDEO = video lesson (Repeaters only) */
  sessionType: ClassSessionType
  durationHours?: number
  facultyId?: Types.ObjectId
  notes?: string
}

export interface IWeeklySchedule extends Document {
  batchId: Types.ObjectId
  weekStartDate: Date
  /** weekStartDate + 6 days */
  weekEndDate: Date
  /** Monday exam topic */
  mondayExamTopic?: string
  /** Friday exam topic */
  fridayExamTopic?: string
  /** Class entries — any day of the week; may include live sessions and recorded videos */
  classEntries: IClassEntry[]
  isPublished: boolean
  publishedAt?: Date
  /** true if this is a revised replacement of a previously published schedule */
  isRevised: boolean
  /** ID of the schedule this revision replaces */
  replacesScheduleId?: Types.ObjectId
}

const ALL_DAYS: ClassEntryDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

const ClassEntrySchema = new Schema<IClassEntry>(
  {
    day:         { type: String, enum: ALL_DAYS, required: true },
    subject:     { type: String, required: true },
    chapter:     { type: String, required: true },
    sessionType:   { type: String, enum: ['LIVE_SESSION', 'RECORDED_VIDEO'], default: 'LIVE_SESSION' },
    durationHours: { type: Number },
    facultyId:     { type: Schema.Types.ObjectId, ref: 'Faculty' },
    notes:       String,
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

export const WeeklySchedule = model<IWeeklySchedule>('WeeklySchedule', WeeklyScheduleSchema)
