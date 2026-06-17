import { Schema, model, Document, Types } from 'mongoose'
import { Subject } from '../types'

export interface ISyllabusChapter extends Document {
  subject: Subject
  chapterName: string
  scheduledMonth: number      // 6=June … 12=December
  chapterOrder: number        // order within that month for that subject
  globalOrder: number         // order across the full year for that subject
  isSplitPart: boolean
  splitGroup?: string         // e.g. "GOC" — links Part 1 and Part 2
  splitPartNumber?: number    // 1 or 2
  parentChapterId?: Types.ObjectId  // Part 2 points to Part 1
  totalVideos: number         // 0 = no video classes for this chapter (bypasses video gate)
  videoReshooting: boolean    // currently being reshot; videos available but under revision
}

const SyllabusChapterSchema = new Schema<ISyllabusChapter>(
  {
    subject:          { type: String, enum: ['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'BOTANY', 'ZOOLOGY', 'MATHS', 'ENGLISH', 'MALAYALAM', 'ARABIC'], required: true },
    chapterName:      { type: String, required: true, trim: true },
    scheduledMonth:   { type: Number, required: true, min: 6, max: 12 },
    chapterOrder:     { type: Number, required: true },
    globalOrder:      { type: Number, required: true },
    isSplitPart:      { type: Boolean, default: false },
    splitGroup:       { type: String },
    splitPartNumber:  { type: Number, enum: [1, 2] },
    parentChapterId:  { type: Schema.Types.ObjectId, ref: 'SyllabusChapter' },
    totalVideos:      { type: Number, default: 0, min: 0 },
    videoReshooting:  { type: Boolean, default: false },
  },
  { timestamps: true }
)

SyllabusChapterSchema.index({ subject: 1, chapterName: 1 }, { unique: true })
SyllabusChapterSchema.index({ subject: 1, scheduledMonth: 1 })
SyllabusChapterSchema.index({ subject: 1, globalOrder: 1 })

export const SyllabusChapter = model<ISyllabusChapter>('SyllabusChapter', SyllabusChapterSchema)
