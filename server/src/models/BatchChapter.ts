import { Schema, model, Document, Types } from 'mongoose'

export interface IBatchChapter extends Document {
  batchId: Types.ObjectId
  subject: string
  chapterName: string
  chapterOrder: number
  // optional link to master syllabus (present for chapters seeded from SyllabusChapter)
  syllabusChapterId?: Types.ObjectId
  scheduledMonth?: number   // expected month from the annual plan (6–12)
  totalVideos?: number      // copied from SyllabusChapter; undefined = legacy record; 0 = no videos (gate bypass)
  videosWatched: number     // how many videos the class teacher has confirmed students watched
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
    scheduledMonth:     { type: Number, min: 1, max: 12 },
    totalVideos:        { type: Number, min: 0 },
    videosWatched:      { type: Number, default: 0, min: 0 },
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
BatchChapterSchema.index({ batchId: 1, scheduledMonth: 1 })

export const BatchChapter = model<IBatchChapter>('BatchChapter', BatchChapterSchema)
