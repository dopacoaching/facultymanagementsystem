import { Schema, model, Document, Types } from 'mongoose'

/**
 * HR-entered "Payable Days" for a faculty/month — used only by
 * OFFICE_STAFF_LEAVE_BASED contracts, where attendance isn't derivable from
 * logged sessions (an office employee may be present with zero sessions on a
 * given day). HR enters the final payable-days figure by hand at month-end;
 * the calculator blocks payroll for that faculty/month until this exists.
 */
export interface IPayableDays extends Document {
  facultyId: Types.ObjectId
  month: number
  year: number
  payableDays: number
  enteredByUserId: Types.ObjectId
}

const PayableDaysSchema = new Schema<IPayableDays>(
  {
    facultyId:       { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    month:           { type: Number, required: true, min: 1, max: 12 },
    year:            { type: Number, required: true },
    payableDays:     { type: Number, required: true, min: 0 },
    enteredByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

PayableDaysSchema.index({ facultyId: 1, month: 1, year: 1 }, { unique: true })

export const PayableDays = model<IPayableDays>('PayableDays', PayableDaysSchema)
