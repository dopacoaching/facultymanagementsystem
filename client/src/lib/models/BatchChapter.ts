import { Schema, model, models, Model, Document, Types } from 'mongoose'

export interface IBatchChapter extends Document {
  batchId: Types.ObjectId
  subject: string
  chapterName: string
  chapterOrder: number
  syllabusChapterId?: Types.ObjectId
  scheduledMonth?: number
  videoComplete: boolean
  videoCompletedAt?: Date
  facultyClassDone: boolean
  facultyClassDoneAt?: Date
  sessionId?: Types.ObjectId
}

const BatchChapterSchema = new Schema<IBatchChapter>(
  {
    batchId:            { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    subject:            { type: String, required: true },
    chapterName:        { type: String, required: true },
    chapterOrder:       { type: Number, required: true },
    syllabusChapterId:  { type: Schema.Types.ObjectId, ref: 'SyllabusChapter' },
    scheduledMonth:     { type: Number, min: 6, max: 12 },
    videoComplete:      { type: Boolean, default: false },
    videoCompletedAt:   Date,
    facultyClassDone:   { type: Boolean, default: false },
    facultyClassDoneAt: Date,
    sessionId:          { type: Schema.Types.ObjectId, ref: 'Session' },
  },
  { timestamps: true }
)

BatchChapterSchema.index({ batchId: 1, subject: 1 })
BatchChapterSchema.index({ batchId: 1, subject: 1, chapterName: 1 }, { unique: true })
BatchChapterSchema.index({ batchId: 1, syllabusChapterId: 1 }, { sparse: true })

export const BatchChapter = (models.BatchChapter as Model<IBatchChapter>) ?? model<IBatchChapter>('BatchChapter', BatchChapterSchema)
