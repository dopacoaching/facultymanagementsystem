import { Schema, model, Document, Types } from 'mongoose'
import { PayrollStatus } from '../types'

export interface ISalaryRecord extends Document {
  facultyId: Types.ObjectId
  month: number
  year: number
  hoursLogged: number
  daysWorked: number
  leavesTaken: number
  overtimeHours: number
  overtimePay: number
  baseSalary: number
  totalDeductions: number
  penaltiesApplied: number
  finalPayable: number
  monthBalance: number
  status: PayrollStatus
  approvedByUserId?: Types.ObjectId
  approvedAt?: Date
}

const SalaryRecordSchema = new Schema<ISalaryRecord>(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    hoursLogged: { type: Number, default: 0 },
    daysWorked: { type: Number, default: 0 },
    leavesTaken: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    baseSalary: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    penaltiesApplied: { type: Number, default: 0 },
    finalPayable: { type: Number, default: 0 },
    monthBalance: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'BLOCKED'], default: 'PENDING' },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
)

SalaryRecordSchema.index({ facultyId: 1, month: 1, year: 1 }, { unique: true })
SalaryRecordSchema.index({ month: 1, year: 1 })

export const SalaryRecord = model<ISalaryRecord>('SalaryRecord', SalaryRecordSchema)
