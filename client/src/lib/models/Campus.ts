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
  { timestamps: true, collection: 'campus' } // actual production collection is singular 'campus', not the Mongoose-pluralized default
)

export const Campus = (models.Campus as Model<ICampus>) ?? model<ICampus>('Campus', CampusSchema)
