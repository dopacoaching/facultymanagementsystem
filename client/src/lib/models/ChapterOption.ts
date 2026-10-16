import { Schema, model, models, Model, Document } from 'mongoose'

/** A chapter name HR/Admin added for a subject, offered in the Push Board chapter
 *  list alongside the syllabus chapters. Works for any subject (incl. ones with no
 *  syllabus on file, e.g. Psychology, Computer Science, Hindi). */
export interface IChapterOption extends Document {
  subject: string
  name: string
  /** Lower-cased name — keeps (subject, name) unique regardless of casing. */
  key: string
}

const ChapterOptionSchema = new Schema<IChapterOption>(
  {
    subject: { type: String, required: true, uppercase: true, trim: true },
    name:    { type: String, required: true, trim: true, maxlength: 120 },
    key:     { type: String, required: true },
  },
  { timestamps: true }
)

ChapterOptionSchema.index({ subject: 1, key: 1 }, { unique: true })

export const ChapterOption =
  (models.ChapterOption as Model<IChapterOption>) ?? model<IChapterOption>('ChapterOption', ChapterOptionSchema)
