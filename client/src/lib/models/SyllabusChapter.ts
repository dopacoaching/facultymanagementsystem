import { Schema, model, models, Model, Document, Types } from 'mongoose'

export interface ISyllabusChapter extends Document {
  subject: string
  chapterName: string
  scheduledMonth: number
  chapterOrder: number
  globalOrder: number
  isSplitPart: boolean
  splitGroup?: string
  splitPartNumber?: number
  parentChapterId?: Types.ObjectId
}

const SyllabusChapterSchema = new Schema<ISyllabusChapter>(
  {
    subject:         { type: String, enum: ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'], required: true },
    chapterName:     { type: String, required: true, trim: true },
    scheduledMonth:  { type: Number, required: true, min: 6, max: 12 },
    chapterOrder:    { type: Number, required: true },
    globalOrder:     { type: Number, required: true },
    isSplitPart:     { type: Boolean, default: false },
    splitGroup:      { type: String },
    splitPartNumber: { type: Number, enum: [1, 2] },
    parentChapterId: { type: Schema.Types.ObjectId, ref: 'SyllabusChapter' },
  },
  { timestamps: true }
)

SyllabusChapterSchema.index({ subject: 1, chapterName: 1 }, { unique: true })
SyllabusChapterSchema.index({ subject: 1, scheduledMonth: 1 })

export const SyllabusChapter =
  (models.SyllabusChapter as Model<ISyllabusChapter>) ??
  model<ISyllabusChapter>('SyllabusChapter', SyllabusChapterSchema)
