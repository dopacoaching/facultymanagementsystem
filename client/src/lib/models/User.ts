import { Schema, model, models, Model, Document, Types } from 'mongoose'
import { UserRole } from '@/lib/types'

export interface IUser extends Document {
  username: string
  passwordHash: string
  role: UserRole
  facultyId?: Types.ObjectId
  batchId?: Types.ObjectId
  isActive: boolean
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'HR_MANAGER', 'COORDINATOR', 'FACULTY', 'IG_ACADEMICS_MANAGER', 'IG_COORDINATOR', 'ACADEMICS_MANAGER'],
      required: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const User = (models.User as Model<IUser>) ?? model<IUser>('User', UserSchema)
