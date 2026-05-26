import { Schema, model, Document, Types } from 'mongoose'

export interface ICarryForwardBalance extends Document {
  facultyId: Types.ObjectId
  month: number
  year: number
  balanceHours: number
}

const CarryForwardBalanceSchema = new Schema<ICarryForwardBalance>(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    balanceHours: { type: Number, required: true },
  },
  { timestamps: true }
)

CarryForwardBalanceSchema.index({ facultyId: 1, month: 1, year: 1 }, { unique: true })

export const CarryForwardBalance = model<ICarryForwardBalance>('CarryForwardBalance', CarryForwardBalanceSchema)
