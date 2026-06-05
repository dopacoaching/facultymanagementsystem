import { Schema, model, Document, Types } from 'mongoose'

export type ISChapterStatus = 'NOT_YET_SCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export interface IISBatchChapter extends Document {
  batchId:           Types.ObjectId
  subject:           string
  chapterName:       string
  chapterOrder:      number
  /** Module number from the yearly plan (1=Apr-May, 2=Jun, 3=Jul, 4=Aug, 5=Sep, 6=Oct) */
  scheduledModule?:  number
  /** Planned teaching hours from the yearly plan */
  durationHours?:    number
  status:            ISChapterStatus
  scheduledDate?:    Date
  completedDate?:    Date
  timetableSlotId?:  Types.ObjectId
}

const ISBatchChapterSchema = new Schema<IISBatchChapter>(
  {
    batchId:          { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    subject:          { type: String, required: true },
    chapterName:      { type: String, required: true },
    chapterOrder:     { type: Number, required: true, default: 0 },
    scheduledModule:  { type: Number },
    durationHours:    { type: Number },
    status:           {
      type:    String,
      enum:    ['NOT_YET_SCHEDULED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'NOT_YET_SCHEDULED',
    },
    scheduledDate:    Date,
    completedDate:    Date,
    timetableSlotId:  { type: Schema.Types.ObjectId, ref: 'ISTimetableSlot' },
  },
  { timestamps: true }
)

ISBatchChapterSchema.index({ batchId: 1, subject: 1, chapterOrder: 1 })
// For searching by chapter name within a batch
ISBatchChapterSchema.index({ batchId: 1, chapterName: 1 })

export const ISBatchChapter = model<IISBatchChapter>('ISBatchChapter', ISBatchChapterSchema)
