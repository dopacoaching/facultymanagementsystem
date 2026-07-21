import { Schema, model, models, Model, Document, Types } from 'mongoose'

export type ClassEntryDay     = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type ClassSessionType  = 'LIVE_SESSION' | 'RECORDED_VIDEO' | 'WEEKLY_EXAM' | 'MONTHLY_EXAM'

export interface IClassEntry {
  day: ClassEntryDay
  subject: string
  chapter: string
  sessionType: ClassSessionType
  /** Planned duration in hours */
  durationHours?: number
  facultyId?: Types.ObjectId
  notes?: string
  /** Optional exact calendar date for this session (YYYY-MM-DD) */
  sessionDate?: Date
  /** Optional start time stored as HH:MM (e.g. "10:30") */
  startTime?: string
  /** For WEEKLY_EXAM: which day the exam falls on */
  examDay?: 'MONDAY' | 'FRIDAY'
  /** For WEEKLY_EXAM / MONTHLY_EXAM: the specific exam date */
  examDate?: Date
}

export interface IWeeklySchedule extends Document {
  batchId: Types.ObjectId
  weekStartDate: Date
  weekEndDate: Date
  mondayExamTopic?: string
  fridayExamTopic?: string
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
    facultyId:     {
      type: Schema.Types.ObjectId,
      ref: 'Faculty',
      required: function(this: IClassEntry) {
        return this.sessionType === 'LIVE_SESSION' || this.sessionType === 'RECORDED_VIDEO';
      }
    },
    notes:         String,
    sessionDate:   {
      type: Date,
      required: function(this: IClassEntry) {
        return this.sessionType === 'LIVE_SESSION' || this.sessionType === 'RECORDED_VIDEO';
      }
    },
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

const DAY_OFFSETS: Record<string, number> = {
  SATURDAY: 0,
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
  FRIDAY: 6,
}

WeeklyScheduleSchema.pre('validate', function (this: IWeeklySchedule) {
  if (this.classEntries && Array.isArray(this.classEntries)) {
    for (const entry of this.classEntries) {
      if ((entry.sessionType === 'LIVE_SESSION' || entry.sessionType === 'RECORDED_VIDEO') && !entry.sessionDate && this.weekStartDate) {
        const date = new Date(this.weekStartDate)
        const offset = DAY_OFFSETS[entry.day] ?? 0
        date.setDate(date.getDate() + offset)
        entry.sessionDate = date
      }
    }
  }
})

WeeklyScheduleSchema.index({ batchId: 1, weekStartDate: 1 })
WeeklyScheduleSchema.index({ batchId: 1, weekStartDate: 1, isPublished: 1 })
WeeklyScheduleSchema.index({ batchId: 1, isPublished: 1 })

export const WeeklySchedule = (models.WeeklySchedule as Model<IWeeklySchedule>) ?? model<IWeeklySchedule>('WeeklySchedule', WeeklyScheduleSchema)
