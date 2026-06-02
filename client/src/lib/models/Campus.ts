import { Schema, model, models, Model, Document } from 'mongoose'

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

export const Campus = (models.Campus as Model<ICampus>) ?? model<ICampus>('Campus', CampusSchema)
