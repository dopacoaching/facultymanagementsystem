import { Schema, model, Document, Types } from 'mongoose'

export interface IPushTeacher {
  name: string
  isActive: boolean
}

/**
 * A campus (or IG school) that logs entries on the Push Board. Managed by
 * HR/Admin from Setup in the Next.js app (same 'pushcampuses' collection) —
 * mirrors client/src/lib/models/PushCampus.ts; keep in sync.
 */
export interface IPushCampus extends Document {
  name: string
  kind: 'CAMPUS' | 'IG'
  teachers: IPushTeacher[]
  /** Campus document whose batches this campus's login may pick. */
  batchCampusId?: Types.ObjectId
  isActive: boolean
}

const PushCampusSchema = new Schema<IPushCampus>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    kind: { type: String, enum: ['CAMPUS', 'IG'], default: 'CAMPUS' },
    teachers: {
      type: [new Schema({
        name: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: true },
      }, { _id: false })],
      default: [],
    },
    batchCampusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'pushcampuses' },
)

export const PushCampus = model<IPushCampus>('PushCampus', PushCampusSchema)
