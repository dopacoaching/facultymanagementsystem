import { Schema, model, Document, Types } from 'mongoose'

export type ClassEntryDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type ClassSessionType = 'LIVE_SESSION' | 'RECORDED_VIDEO' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

/** A single class entry for any day of the week */
export interface IClassEntry {
  day: ClassEntryDay
  subject: string
  chapter: string
  sessionType: ClassSessionType
  durationHours?: number
  facultyId?: Types.ObjectId
  notes?: string
  /** Optional exact calendar date for this session (YYYY-MM-DD) */
  sessionDate?: Date
  /** Optional start time, stored as HH:MM (e.g. "10:30") */
  startTime?: string
  /** For WEEKLY_EXAM: which day the exam falls on */
  examDay?: 'MONDAY' | 'FRIDAY'
  /** For WEEKLY_EXAM / MONTHLY_EXAM: the specific exam date */
  examDate?: Date
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
  /** Class entries — any day of the week */
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
    day:           { type: String, enum: ALL_DAYS, required: true },
    subject:       { type: String, required: true },
    chapter:       { type: String, required: true },
    sessionType:   { type: String, enum: ['LIVE_SESSION', 'RECORDED_VIDEO', 'WEEKLY_EXAM', 'MONTHLY_EXAM'], default: 'LIVE_SESSION' },
    durationHours: { type: Number },
    facultyId:     { type: Schema.Types.ObjectId, ref: 'Faculty' },
    notes:         String,
    sessionDate:   Date,
    startTime:     String,
    examDay:       { type: String, enum: ['MONDAY', 'FRIDAY'] },
    examDate:      Date,
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

// NOTE: Unique index removed — uniqueness on unpublished revisions is enforced
// at the application level in the revise controller (returns 409 if one exists).
// The previous unique index on { batchId, weekStartDate, isRevised } prevented
// more than one revision chain per week (e.g. revise → publish → revise again → 500).

export const WeeklySchedule = model<IWeeklySchedule>('WeeklySchedule', WeeklyScheduleSchema)
