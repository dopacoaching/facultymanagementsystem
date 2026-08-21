import { Schema, model, models, Model, Document, Types } from 'mongoose'
import { UserRole } from '@/lib/types'

export interface IUser extends Document {
  username: string
  passwordHash: string
  role: UserRole
  facultyId?: Types.ObjectId
  batchId?: Types.ObjectId
  /** Restricts ACADEMICS_MANAGER to a single batch type (RESIDENTIAL | OFFLINE | ONLINE) */
  batchType?: string
  /** Shared campus login (CLASS_TEACHER): which of the fixed campus list this account logs sessions for. */
  campusName?: string
  /** IG_CLASS_TEACHER: which Campus this account manages IG batches/sessions for. */
  campusId?: Types.ObjectId
  isActive: boolean
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'HR_MANAGER', 'CLASS_TEACHER', 'FACULTY', 'IG_ACADEMICS_MANAGER', 'IG_CLASS_TEACHER', 'ACADEMICS_MANAGER'],
      required: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    batchId:   { type: Schema.Types.ObjectId, ref: 'Batch' },
    batchType: { type: String, enum: ['RESIDENTIAL', 'OFFLINE', 'ONLINE'] },
    campusName: { type: String },
    campusId:  { type: Schema.Types.ObjectId, ref: 'Campus' },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const User = (models.User as Model<IUser>) ?? model<IUser>('User', UserSchema)
