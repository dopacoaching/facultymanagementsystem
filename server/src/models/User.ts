import { Schema, model, Document, Types } from 'mongoose'
import { UserRole } from '../types'

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
      enum: ['ADMIN', 'HR_MANAGER', 'COORDINATOR', 'FACULTY', 'IS_ACADEMICS_MANAGER', 'IS_COORDINATOR', 'ACADEMICS_MANAGER'],
      required: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const User = model<IUser>('User', UserSchema)
