import { Schema, model, Document } from 'mongoose'

export interface ICampus extends Document {
  name: string
  location?: string
  isActive: boolean
}

const CampusSchema = new Schema<ICampus>(
  {
    name: { type: String, required: true, unique: true },
    location: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Campus = model<ICampus>('Campus', CampusSchema)
