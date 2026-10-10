import { Schema, model, models, Model, Document, Types } from 'mongoose'

export interface IPushTeacher {
  name: string
  isActive: boolean
}

/**
 * A campus (or IG school) that logs entries on the Push Board. Replaces the
 * hard-coded CAMPUSES / IG_TEACHERS lists: HR/Admin manage it from Setup.
 * `name` is the string stored on Session.campusName, NoClassDay.campusName and
 * User.campusName, so renaming cascades (see the setup API).
 */
export interface IPushCampus extends Document {
  name: string
  kind: 'CAMPUS' | 'IG'
  /** "Updated by" / "Marked by" names offered to the campus login. */
  teachers: IPushTeacher[]
  /** Campus document whose batches this campus's login may pick. Absent => no batch field. */
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

export const PushCampus = (models.PushCampus as Model<IPushCampus>) ?? model<IPushCampus>('PushCampus', PushCampusSchema)
